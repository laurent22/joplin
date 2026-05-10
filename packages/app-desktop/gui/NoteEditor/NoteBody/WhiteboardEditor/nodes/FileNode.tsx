import * as React from 'react';
import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, NodeProps, NodeResizer } from '@xyflow/react';
import { pathToFileURL } from 'url';
import { MarkupLanguage } from '@joplin/renderer';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import ItemChange from '@joplin/lib/models/ItemChange';
import { ModelType } from '@joplin/lib/BaseModel';
import attachedResources from '@joplin/lib/utils/attachedResources';
import Logger from '@joplin/utils/Logger';
import { resourceFullPath } from '@joplin/lib/models/utils/resourceUtils';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import { FileCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { isInternalRef, RefKind, resolveFileRef } from '@joplin/lib/services/whiteboard/resolveRef';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import useCheckboxToggle from '../useCheckboxToggle';
import { whiteboardColors } from '../theme';
import { bodyStyle, cardStyle, handlePositions, headerStyle } from './sharedStyles';

const logger = Logger.create('WhiteboardFileNode');

// Header showing the linked note's title — replaces the generic "NOTE" badge
// when we know the title. Truncated with ellipsis on overflow.
const noteHeaderStyle = (textColor: string, dividerColor: string): CSSProperties => ({
	fontSize: 12,
	fontWeight: 600,
	color: textColor,
	padding: '5px 8px',
	borderBottom: `1px solid ${dividerColor}`,
	flexShrink: 0,
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
});

// Build a file:// URL pointing at the resource's blob on disk. Delegates
// the path-on-disk computation to resourceFullPath so we get the same
// extension logic as the rest of Joplin (file_extension first, then a
// mime → extension fallback for resources missing an explicit extension).
// pathToFileURL handles Windows separators and special-character encoding.
const resourceUrlFor = (resource: ResourceEntity | null, resourceDirectory: string): string | null => {
	if (!resource || !resourceDirectory) return null;
	return pathToFileURL(resourceFullPath(resource, resourceDirectory)).href;
};

interface ResolvedItem {
	kind: 'note' | 'resource' | 'unknown';
	title: string;
	body?: string;
	// Note metadata used to gate writes from this card (e.g. checkbox
	// toggling) and to enable conflict detection on save.
	userUpdatedTime?: number;
	deletedTime?: number;
	// The full resource entity for `kind: 'resource'` items, so we can pass
	// it straight to resourceFullPath / resourceFilename (which know how to
	// fall back from missing file_extension to a mime-derived one).
	resource?: ResourceEntity;
}

const useResolvedRef = (file: string): { resolved: ResolvedItem | null; refetch: ()=> void } => {
	const [resolved, setResolved] = useState<ResolvedItem | null>(null);
	const [refetchCount, setRefetchCount] = useState(0);
	const lastLoadedFileRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const ref = resolveFileRef(file);
		if (ref.kind === RefKind.External) {
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
		void (async () => {
			try {
				const item = await BaseItem.loadItemById(ref.id);
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
						resource: item as ResourceEntity,
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
	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		ctx.onOpenRef(node.file);
	}, [ctx, node.file]);

	const { resolved, refetch } = useResolvedRef(node.file);
	// Internal refs go through the resolved resource (which carries mime +
	// file_extension from the database). External refs may already be URLs
	// (http/https/file), in which case we use them as-is for rendering;
	// bare paths from other tools can't be resolved here so we leave url null and fall
	// back to the text branch.
	const isInternal = isInternalRef(node.file);
	const url = isInternal
		? resourceUrlFor(resolved?.resource ?? null, ctx.resourceDirectory)
		: (/^(https?:|file:)\/\//i.test(node.file) ? node.file : null);
	const mime = resolved?.resource?.mime;
	const isPdf = isInternal
		? mime === 'application/pdf'
		: /\.pdf(\?|$|#)/i.test(node.file);
	const isImage = isInternal
		? !!mime?.startsWith('image/')
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
	const linkedNoteId = resolved?.kind === 'note' ? resolveFileRef(node.file).id : null;
	const linkedNoteUserUpdatedTime = resolved?.kind === 'note' ? resolved.userUpdatedTime : undefined;
	const linkedNoteDeletedTime = resolved?.kind === 'note' ? resolved.deletedTime : undefined;
	// Per-card in-flight flag. Rapid checkbox toggles can otherwise overwrite
	// each other because all clicks read from the same stale `resolved.body`
	// until refetch completes. While a save is pending we drop further
	// toggles; the user retries once the preview catches up.
	const savingRef = useRef(false);
	const onLinkedNoteBodyChange = useCallback(async (newBody: string) => {
		if (!linkedNoteId) return;
		// Don't write to deleted (in-trash) notes — Note.save would either
		// fail or, worse, silently resurrect the note via the timestamp bump.
		if (linkedNoteDeletedTime) {
			logger.info(`Ignoring checkbox toggle on deleted note: ${linkedNoteId}`);
			return;
		}
		if (savingRef.current) {
			logger.info(`Dropped concurrent toggle on ${linkedNoteId} — a save is in flight`);
			return;
		}
		savingRef.current = true;
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
		} finally {
			savingRef.current = false;
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
					<div style={noteHeaderStyle(colors.textColor, colors.dividerColor)} title={resolved.title}>{resolved.title}</div>
					<div ref={checkboxRef} className="wb-card-md" style={bodyStyle(colors)} dangerouslySetInnerHTML={{ __html: noteHtml }} />
				</>
			);
		}

		// Internal resource (non-image / non-pdf) — show its title.
		if (resolved?.kind === 'resource') {
			return (
				<>
					<div style={headerStyle(colors)}>Resource</div>
					<div style={bodyStyle(colors)}>{resolved.title}</div>
				</>
			);
		}

		// Loading or external file path.
		return (
			<>
				<div style={headerStyle(colors)}>{node.file.startsWith(':/') ? 'Note / Resource' : 'File'}</div>
				<div style={bodyStyle(colors)}>{resolved === null && node.file.startsWith(':/') ? 'Loading…' : node.file}</div>
			</>
		);
	};

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={!!selected} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} style={{ background: colors.handleColor }} />
			))}
			<div style={cardStyle(colors, !!selected)} onDoubleClick={onDoubleClick}>
				{renderContent()}
			</div>
		</>
	);
};

export default FileNode;
