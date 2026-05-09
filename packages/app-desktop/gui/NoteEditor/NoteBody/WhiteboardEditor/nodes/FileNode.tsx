import * as React from 'react';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, NodeProps, NodeResizer, Position } from '@xyflow/react';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { MarkupLanguage } from '@joplin/renderer';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import ItemChange from '@joplin/lib/models/ItemChange';
import { ModelType } from '@joplin/lib/BaseModel';
import attachedResources from '@joplin/lib/utils/attachedResources';
import Logger from '@joplin/utils/Logger';
import { FileCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { isInternalRef } from '@joplin/lib/services/whiteboard/resolveRef';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import useCheckboxToggle from '../useCheckboxToggle';

const logger = Logger.create('WhiteboardFileNode');

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

// Build a file:// URL pointing at the resource's blob on disk. Joplin stores
// resources as `${id}.${file_extension}`, so the extension (or, failing that,
// a mime-derived one) must be appended — without it the URL points to a
// non-existent file. Uses path.join + pathToFileURL so Windows paths and
// special characters in the resource directory are encoded correctly.
const resourceUrlFor = (file: string, resourceDirectory: string, fileExtension?: string): string | null => {
	if (!isInternalRef(file)) return null;
	if (!resourceDirectory) return null;
	const id = file.slice(2).split('#')[0];
	const filename = fileExtension ? `${id}.${fileExtension}` : id;
	return pathToFileURL(path.join(resourceDirectory, filename)).href;
};

interface ResolvedItem {
	kind: 'note' | 'resource' | 'unknown';
	title: string;
	body?: string;
	// Note metadata used to gate writes from this card (e.g. checkbox
	// toggling) and to enable conflict detection on save.
	userUpdatedTime?: number;
	deletedTime?: number;
	// Resource metadata: needed to build a working file URL (Joplin stores
	// resources on disk as `${id}.${file_extension}`) and to detect image /
	// PDF resources for inline rendering. The bare `:/id` ref carries no
	// extension or mime info.
	mime?: string;
	fileExtension?: string;
}

const useResolvedRef = (file: string): { resolved: ResolvedItem | null; refetch: ()=> void } => {
	const [resolved, setResolved] = useState<ResolvedItem | null>(null);
	const [refetchCount, setRefetchCount] = useState(0);
	const lastLoadedFileRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		if (!isInternalRef(file)) {
			setResolved(null);
			lastLoadedFileRef.current = null;
			return undefined;
		}
		// Clear any previously-resolved item before loading when the ref has
		// changed, so switching from one internal ref to another doesn't show
		// stale content during the async load. Skip the clear on a refetch
		// of the same ref (e.g. after a checkbox toggle saves the note) —
		// otherwise the preview would flicker on every refetch.
		if (lastLoadedFileRef.current !== file) {
			setResolved(null);
			lastLoadedFileRef.current = file;
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
						userUpdatedTime: item.user_updated_time,
						deletedTime: item.deleted_time,
					});
				} else if (item.type_ === ModelType.Resource) {
					setResolved({
						kind: 'resource',
						title: item.title || file,
						mime: item.mime,
						fileExtension: item.file_extension,
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
	// External (non-internal) refs may carry an extension in the path, so
	// fall back to a regex on `node.file` for those. Internal refs go through
	// the resolved mime + file_extension pulled from the database.
	const isInternal = isInternalRef(node.file);
	const url = isInternal
		? resourceUrlFor(node.file, ctx.resourceDirectory, resolved?.fileExtension)
		: null;
	const isPdf = isInternal
		? resolved?.mime === 'application/pdf'
		: /\.pdf(\?|$|#)/i.test(node.file);
	const isImage = isInternal
		? !!resolved?.mime?.startsWith('image/')
		: /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$|#)/i.test(node.file);

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
	const linkedNoteUserUpdatedTime = resolved?.kind === 'note' ? resolved.userUpdatedTime : undefined;
	const linkedNoteDeletedTime = resolved?.kind === 'note' ? resolved.deletedTime : undefined;
	const onLinkedNoteBodyChange = useCallback(async (newBody: string) => {
		if (!linkedNoteId) return;
		// Don't write to deleted (in-trash) notes — Note.save would either
		// fail or, worse, silently resurrect the note via the timestamp bump.
		if (linkedNoteDeletedTime) {
			logger.info(`Ignoring checkbox toggle on deleted note: ${linkedNoteId}`);
			return;
		}
		try {
			// Pass user_updated_time so the save layer can detect concurrent
			// edits (e.g. the same note open in another window). changeSource
			// is set explicitly so sync/telemetry can attribute the write.
			await Note.save(
				{
					id: linkedNoteId,
					body: newBody,
					...(linkedNoteUserUpdatedTime ? { user_updated_time: linkedNoteUserUpdatedTime } : {}),
				},
				{ changeSource: ItemChange.SOURCE_UNSPECIFIED },
			);
			refetch();
		} catch (error) {
			// Read-only / shared-without-write-permission notes throw here.
			// Log and leave the preview as-is — the next refetch will revert
			// the visible checkbox state to match the on-disk body.
			logger.warn(`Could not save linked note ${linkedNoteId}:`, error);
			refetch();
		}
	}, [linkedNoteId, linkedNoteUserUpdatedTime, linkedNoteDeletedTime, refetch]);
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
