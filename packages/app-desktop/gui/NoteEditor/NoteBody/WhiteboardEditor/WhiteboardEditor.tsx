import * as React from 'react';
import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { NoteBodyEditorProps, NoteBodyEditorRef } from '../../utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import Note from '@joplin/lib/models/Note';
import { Canvas, CanvasNode, FileCanvasNode, TextCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { parseWhiteboard } from '@joplin/lib/services/whiteboard/parse';
import { serializeWhiteboard } from '@joplin/lib/services/whiteboard/serialize';
import { _ } from '@joplin/lib/locale';
import { WhiteboardContext } from './WhiteboardContext';
import WhiteboardSurface from './WhiteboardSurface';

const SAVE_DEBOUNCE_MS = 400;

const WhiteboardEditor = (props: NoteBodyEditorProps, ref: ForwardedRef<NoteBodyEditorRef>) => {
	const bodyRef = useRef(props.content);
	bodyRef.current = props.content;

	const initialParse = useMemo(() => parseWhiteboard(props.content), [props.content]);
	const initialCanvas = initialParse.canvas;
	const parseError = initialParse.parseError;
	const [canvas, setCanvas] = useState<Canvas>(initialCanvas);
	// Mirror the canvas state in a ref so async handlers can read the latest
	// version without going through a setCanvas updater (which must stay pure).
	const canvasRef = useRef<Canvas>(initialCanvas);
	canvasRef.current = canvas;

	// Debounced save. We split "schedule" from "unmount" cleanup because the
	// effect's normal cleanup runs whenever `canvas` changes — that's a
	// re-schedule, not a reason to drop the pending save. Only an actual
	// unmount (or an explicit caller via `content()`) should flush.
	const lastSerializedRef = useRef<string>(JSON.stringify(canvas));
	const pendingSerializedRef = useRef<string | null>(null);
	const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onChangeRef = useRef(props.onChange);
	onChangeRef.current = props.onChange;

	// Reload when the body switches to a different note, or when the body has
	// changed underneath us (external write — e.g. the "add note to whiteboard"
	// command — which produces a body we didn't emit).
	const lastEmittedBodyRef = useRef<string>(props.content);
	useEffect(() => {
		if (props.content === lastEmittedBodyRef.current) return;
		lastEmittedBodyRef.current = props.content;
		const parsed = parseWhiteboard(props.content);
		setCanvas(parsed.canvas);
		// Mark the freshly-loaded canvas as already-synced so the debounced
		// save effect doesn't echo it straight back as a write.
		lastSerializedRef.current = JSON.stringify(parsed.canvas);
	}, [props.content, props.contentKey]);

	const flushPendingSave = useCallback((): string => {
		if (pendingTimeoutRef.current !== null) {
			clearTimeout(pendingTimeoutRef.current);
			pendingTimeoutRef.current = null;
		}
		const serialized = pendingSerializedRef.current;
		if (serialized === null) return bodyRef.current;
		pendingSerializedRef.current = null;
		lastSerializedRef.current = serialized;
		const newBody = serializeWhiteboard(bodyRef.current, JSON.parse(serialized) as Canvas);
		bodyRef.current = newBody;
		lastEmittedBodyRef.current = newBody;
		onChangeRef.current({ changeId: null, content: newBody });
		return newBody;
	}, []);

	useEffect(() => {
		// Never write back when the source body had an unparseable fence —
		// otherwise opening a corrupt note would silently overwrite the
		// user's recoverable JSON with an empty canvas.
		if (parseError) return undefined;
		const serialized = JSON.stringify(canvas);
		if (serialized === lastSerializedRef.current) return undefined;
		pendingSerializedRef.current = serialized;
		// Replace any prior pending timeout — we'll re-schedule from the new
		// canvas. Crucially we do NOT clear the pending serialised payload
		// here, so the unmount-flush effect can still see it.
		if (pendingTimeoutRef.current !== null) clearTimeout(pendingTimeoutRef.current);
		pendingTimeoutRef.current = setTimeout(() => {
			pendingTimeoutRef.current = null;
			flushPendingSave();
		}, SAVE_DEBOUNCE_MS);
		return undefined;
	}, [canvas, flushPendingSave, parseError]);

	// Flush on unmount. The empty-deps effect's cleanup only fires once.
	useEffect(() => {
		return () => { flushPendingSave(); };
	}, [flushPendingSave]);

	useImperativeHandle(ref, () => ({
		// Callers that read `content()` (e.g. the form-note save flow) get
		// the latest body even if a debounced save is still pending.
		content: () => flushPendingSave(),
		resetScroll: () => { /* not applicable */ },
		scrollTo: () => { /* not applicable */ },
		supportsCommand: () => false,
		execCommand: async () => { /* not applicable */ },
	}), [flushPendingSave]);

	const onUpdateNode = useCallback((nodeId: string, patch: Record<string, unknown>) => {
		setCanvas(prev => ({
			...prev,
			nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...patch } as CanvasNode : n),
		}));
	}, []);

	const onOpenRef = useCallback((value: string) => {
		if (!value) return;
		// `openItem` already handles every supported link form: `:/id`,
		// `joplin://`, `file://`, any other URL scheme (http/https/mailto/
		// ftp/...), and shows a user-facing error for unsupported strings.
		void CommandService.instance().execute('openItem', value);
	}, []);

	// Promote a text card to a real Joplin note: create a note in the same
	// folder as the whiteboard, with the card's text as body and its first
	// non-empty line as title; replace the text node with a file-ref node
	// pointing at the new note.
	const onPromoteTextNode = useCallback(async (canvasNodeId: string) => {
		const noteId = props.noteId;
		if (!noteId) return;

		// Read the latest canvas state directly — never inside a setCanvas
		// updater, since updaters must stay pure (React 18 strict mode runs
		// them twice in dev, which would create the note twice).
		const node = canvasRef.current.nodes.find(n => n.id === canvasNodeId) as TextCanvasNode | undefined;
		if (!node || node.type !== 'text') return;

		const parentNote = await Note.load(noteId);
		if (!parentNote) return;

		const title = (node.text.split('\n').find(l => l.trim().length) || '').replace(/^#+\s*/, '').trim() || 'Untitled';
		const created = await Note.save({
			parent_id: parentNote.parent_id,
			title,
			body: node.text,
		});

		// Re-locate the node from the latest state in case it moved/resized
		// between the promote click and the save returning. If it was deleted
		// in the meantime, drop the operation silently.
		const latest = canvasRef.current.nodes.find(n => n.id === canvasNodeId) as TextCanvasNode | undefined;
		if (!latest || latest.type !== 'text') return;

		const replacement: FileCanvasNode = {
			id: latest.id,
			type: 'file',
			x: latest.x,
			y: latest.y,
			width: latest.width,
			height: latest.height,
			file: `:/${created.id}`,
		};
		setCanvas(curr => ({
			...curr,
			nodes: curr.nodes.map(n => n.id === latest.id ? replacement : n),
		}));
	}, [props.noteId]);

	const contextValue = useMemo(() => ({
		markupToHtml: props.markupToHtml,
		resourceInfos: props.resourceInfos,
		resourceDirectory: props.resourceDirectory,
		themeId: props.themeId,
		onOpenRef,
		onUpdateNode,
		onPromoteTextNode,
	}), [props.markupToHtml, props.resourceInfos, props.resourceDirectory, props.themeId, onOpenRef, onUpdateNode, onPromoteTextNode]);

	if (parseError) {
		return (
			<div className="whiteboard-editor" style={props.style}>
				<div className="error">
					<div className="panel">
						<div className="title">{_('This whiteboard could not be loaded')}</div>
						<div className="detail">{parseError}</div>
						<div>{_('Click the eye icon in the toolbar to switch to the Markdown editor and fix the JSON manually.')}</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="whiteboard-editor" style={props.style}>
			<WhiteboardContext.Provider value={contextValue}>
				<WhiteboardSurface
					canvas={canvas}
					onChange={setCanvas}
				/>
			</WhiteboardContext.Provider>
		</div>
	);
};

export default forwardRef(WhiteboardEditor);
