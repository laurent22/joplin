import * as React from 'react';
import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { NoteBodyEditorProps, NoteBodyEditorRef } from '../../utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import Note from '@joplin/lib/models/Note';
import { Canvas, CanvasNode, FileCanvasNode, TextCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { isInternalRef } from '@joplin/lib/services/whiteboard/resolveRef';
import { parseWhiteboard } from '@joplin/lib/services/whiteboard/parse';
import { serializeWhiteboard } from '@joplin/lib/services/whiteboard/serialize';
import { WhiteboardContext } from './WhiteboardContext';
import WhiteboardSurface from './WhiteboardSurface';

const SAVE_DEBOUNCE_MS = 400;

const WhiteboardEditor = (props: NoteBodyEditorProps, ref: ForwardedRef<NoteBodyEditorRef>) => {
	const bodyRef = useRef(props.content);
	bodyRef.current = props.content;

	const initialCanvas = useMemo(() => parseWhiteboard(props.content).canvas, [props.content]);
	const [canvas, setCanvas] = useState<Canvas>(initialCanvas);

	// Reload when the body switches to a different note, or when the body has
	// changed underneath us (external write — e.g. the "add note to whiteboard"
	// command — which produces a body we didn't emit).
	const lastEmittedBodyRef = useRef<string>(props.content);
	useEffect(() => {
		if (props.content === lastEmittedBodyRef.current) return;
		lastEmittedBodyRef.current = props.content;
		const parsed = parseWhiteboard(props.content);
		setCanvas(parsed.canvas);
	}, [props.content, props.contentKey]);

	// Debounced save.
	const lastSerializedRef = useRef<string>(JSON.stringify(canvas));
	useEffect(() => {
		const serialized = JSON.stringify(canvas);
		if (serialized === lastSerializedRef.current) return undefined;
		const handle = setTimeout(() => {
			lastSerializedRef.current = serialized;
			const newBody = serializeWhiteboard(bodyRef.current, canvas);
			bodyRef.current = newBody;
			lastEmittedBodyRef.current = newBody;
			props.onChange({ changeId: null, content: newBody });
		}, SAVE_DEBOUNCE_MS);
		return () => clearTimeout(handle);
	}, [canvas, props.onChange]);

	useImperativeHandle(ref, () => ({
		content: () => bodyRef.current,
		resetScroll: () => { /* not applicable */ },
		scrollTo: () => { /* not applicable */ },
		supportsCommand: () => false,
		execCommand: async () => { /* not applicable */ },
	}), []);

	const onAddNode = useCallback((node: CanvasNode) => {
		setCanvas(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
	}, []);

	const onUpdateNode = useCallback((nodeId: string, patch: Record<string, unknown>) => {
		setCanvas(prev => ({
			...prev,
			nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...patch } as CanvasNode : n),
		}));
	}, []);

	const onOpenRef = useCallback((value: string) => {
		if (isInternalRef(value)) {
			const id = value.slice(2).split('#')[0];
			void CommandService.instance().execute('openItem', `:/${id}`);
		} else if (/^https?:\/\//i.test(value)) {
			void CommandService.instance().execute('openItem', value);
		}
	}, []);

	// Promote a text card to a real Joplin note: create a note in the same
	// folder as the whiteboard, with the card's text as body and its first
	// non-empty line as title; replace the text node with a file-ref node
	// pointing at the new note.
	const onPromoteTextNode = useCallback(async (canvasNodeId: string) => {
		const noteId = props.noteId;
		if (!noteId) return;
		const parentNote = await Note.load(noteId);
		if (!parentNote) return;

		setCanvas(prev => {
			const node = prev.nodes.find(n => n.id === canvasNodeId) as TextCanvasNode | undefined;
			if (!node || node.type !== 'text') return prev;
			const title = (node.text.split('\n').find(l => l.trim().length) || '').replace(/^#+\s*/, '').trim() || 'Untitled';
			void (async () => {
				const created = await Note.save({
					parent_id: parentNote.parent_id,
					title,
					body: node.text,
				});
				const replacement: FileCanvasNode = {
					id: node.id,
					type: 'file',
					x: node.x,
					y: node.y,
					width: node.width,
					height: node.height,
					file: `:/${created.id}`,
				};
				setCanvas(curr => ({
					...curr,
					nodes: curr.nodes.map(n => n.id === node.id ? replacement : n),
				}));
			})();
			return prev;
		});
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

	return (
		<div style={{ ...props.style, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
			<WhiteboardContext.Provider value={contextValue}>
				<WhiteboardSurface
					canvas={canvas}
					onChange={setCanvas}
					onAddNode={onAddNode}
				/>
			</WhiteboardContext.Provider>
		</div>
	);
};

export default forwardRef(WhiteboardEditor);
