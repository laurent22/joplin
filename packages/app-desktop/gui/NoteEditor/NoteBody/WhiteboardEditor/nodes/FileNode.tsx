import * as React from 'react';
import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { Handle, NodeProps, NodeResizer, Position } from '@xyflow/react';
import { MarkupLanguage } from '@joplin/renderer';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import { ModelType } from '@joplin/lib/BaseModel';
import attachedResources from '@joplin/lib/utils/attachedResources';
import { FileCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { isInternalRef } from '@joplin/lib/services/whiteboard/resolveRef';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import useCheckboxToggle from '../useCheckboxToggle';

const cardStyle = (selected: boolean): CSSProperties => ({
	width: '100%',
	height: '100%',
	border: selected ? '2px solid #4a90e2' : '1px solid #d0d0d0',
	borderRadius: 6,
	background: '#ffffff',
	overflow: 'hidden',
	boxShadow: selected ? '0 4px 12px rgba(74,144,226,0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
	boxSizing: 'border-box',
	display: 'flex',
	flexDirection: 'column',
});

const headerStyle: CSSProperties = {
	fontSize: 11,
	color: '#888',
	padding: '4px 8px',
	borderBottom: '1px solid #eee',
	textTransform: 'uppercase',
	letterSpacing: 0.5,
	flexShrink: 0,
};

// Header showing the linked note's title — replaces the generic "NOTE" badge
// when we know the title. Truncated with ellipsis on overflow.
const noteHeaderStyle: CSSProperties = {
	fontSize: 12,
	fontWeight: 600,
	color: '#444',
	padding: '5px 8px',
	borderBottom: '1px solid #eee',
	flexShrink: 0,
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
};

const bodyStyle: CSSProperties = {
	flex: 1,
	padding: 8,
	overflow: 'auto',
	wordBreak: 'break-word',
	fontSize: 13,
	lineHeight: 1.4,
};

const handlePositions = [
	{ id: 'top', position: Position.Top },
	{ id: 'right', position: Position.Right },
	{ id: 'bottom', position: Position.Bottom },
	{ id: 'left', position: Position.Left },
];

const resourceUrlFor = (file: string, resourceDirectory: string): string | null => {
	if (!isInternalRef(file)) return null;
	const id = file.slice(2).split('#')[0];
	if (!resourceDirectory) return null;
	return `file://${resourceDirectory}/${id}`;
};

interface ResolvedItem {
	kind: 'note' | 'resource' | 'unknown';
	title: string;
	body?: string;
}

const useResolvedRef = (file: string): { resolved: ResolvedItem | null; refetch: ()=> void } => {
	const [resolved, setResolved] = useState<ResolvedItem | null>(null);
	const [refetchCount, setRefetchCount] = useState(0);

	useEffect(() => {
		let cancelled = false;
		if (!isInternalRef(file)) {
			setResolved(null);
			return undefined;
		}
		const id = file.slice(2).split('#')[0];
		void (async () => {
			try {
				const item = await BaseItem.loadItemById(id);
				if (cancelled) return;
				if (!item) {
					setResolved({ kind: 'unknown', title: file });
					return;
				}
				if (item.type_ === ModelType.Note) {
					setResolved({
						kind: 'note',
						title: item.title || 'Untitled',
						body: item.body || '',
					});
				} else if (item.type_ === ModelType.Resource) {
					setResolved({
						kind: 'resource',
						title: item.title || file,
					});
				} else {
					setResolved({ kind: 'unknown', title: file });
				}
			} catch {
				if (!cancelled) setResolved({ kind: 'unknown', title: file });
			}
		})();
		return () => { cancelled = true; };
	}, [file, refetchCount]);

	return { resolved, refetch: () => setRefetchCount(c => c + 1) };
};

const FileNode = ({ data, selected }: NodeProps<{ id: string; type: 'wbFile'; data: WhiteboardNodeData; position: { x: number; y: number } }>) => {
	const ctx = useWhiteboardContext();
	const node = data.canvasNode as FileCanvasNode;

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		ctx.onOpenRef(node.file);
	}, [ctx, node.file]);

	const { resolved, refetch } = useResolvedRef(node.file);
	const url = resourceUrlFor(node.file, ctx.resourceDirectory);
	const isPdf = /\.pdf(\?|$|#)/i.test(node.file);
	const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$|#)/i.test(node.file);

	// Render note bodies as compiled HTML, like the TextNode does. Resources
	// linked from the note body need to be resolved separately — the editor's
	// own resourceInfos only covers resources of the *whiteboard* note.
	const [noteHtml, setNoteHtml] = useState<string>('');
	useEffect(() => {
		let cancelled = false;
		if (resolved?.kind !== 'note' || !resolved.body) {
			setNoteHtml('');
			return undefined;
		}
		void (async () => {
			try {
				const linkedResources = await attachedResources(resolved.body);
				if (cancelled) return;
				const result = await ctx.markupToHtml(MarkupLanguage.Markdown, resolved.body, {
					resourceInfos: linkedResources,
				});
				if (!cancelled) setNoteHtml(result?.html ?? '');
			} catch {
				if (!cancelled) setNoteHtml('');
			}
		})();
		return () => { cancelled = true; };
	}, [resolved, ctx]);

	// Save the linked note's body when the user toggles a checkbox in its
	// preview. We rely on the same reload-on-external-change path that lets
	// other commands (e.g. addNoteToWhiteboard) update notes outside the
	// editor's own state — once the body is saved, refetching `resolved`
	// happens via `useResolvedRef` which is keyed on `node.file`.
	const linkedNoteId = resolved?.kind === 'note' ? node.file.slice(2).split('#')[0] : null;
	const onLinkedNoteBodyChange = useCallback(async (newBody: string) => {
		if (!linkedNoteId) return;
		await Note.save({ id: linkedNoteId, body: newBody });
		refetch();
	}, [linkedNoteId, refetch]);
	const checkboxRef = useCheckboxToggle({
		body: resolved?.kind === 'note' ? (resolved.body ?? '') : '',
		onChange: onLinkedNoteBodyChange,
	});

	const renderContent = () => {
		// Image / PDF resource — render directly.
		if (url && isImage) {
			return <img src={url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', alignSelf: 'center', flex: 1 }} alt={resolved?.title ?? ''} />;
		}
		if (url && isPdf) {
			return <embed src={url} type="application/pdf" style={{ width: '100%', height: '100%' }} />;
		}

		// Internal note ref — show the note's title in the header and the body
		// preview below.
		if (resolved?.kind === 'note') {
			return (
				<>
					<div style={noteHeaderStyle} title={resolved.title}>{resolved.title}</div>
					<div ref={checkboxRef} className="wb-card-md" style={bodyStyle} dangerouslySetInnerHTML={{ __html: noteHtml }} />
				</>
			);
		}

		// Internal resource (non-image / non-pdf) — show its title.
		if (resolved?.kind === 'resource') {
			return (
				<>
					<div style={headerStyle}>Resource</div>
					<div style={bodyStyle}>{resolved.title}</div>
				</>
			);
		}

		// Loading or external file path.
		return (
			<>
				<div style={headerStyle}>{node.file.startsWith(':/') ? 'Note / Resource' : 'File'}</div>
				<div style={bodyStyle}>{resolved === null && node.file.startsWith(':/') ? 'Loading…' : node.file}</div>
			</>
		);
	};

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={!!selected} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} style={{ background: '#888' }} />
			))}
			<div style={cardStyle(!!selected)} onDoubleClick={onDoubleClick}>
				{renderContent()}
			</div>
		</>
	);
};

export default FileNode;
