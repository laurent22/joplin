import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, NodeProps, NodeResizer } from '@xyflow/react';
import { pathToFileURL } from 'url';
import { MarkupLanguage } from '@joplin/renderer';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import ItemChange from '@joplin/lib/models/ItemChange';
import { ModelType } from '@joplin/lib/BaseModel';
import attachedResources from '@joplin/lib/utils/attachedResources';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { resourceFullPath } from '@joplin/lib/models/utils/resourceUtils';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import { FileCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { isInternalRef, RefKind, resolveFileRef } from '@joplin/lib/services/whiteboard/resolveRef';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import useCheckboxToggle from '../useCheckboxToggle';
import handlePositions from './handlePositions';

const logger = Logger.create('WhiteboardFileNode');

const resourceUrlFor = (resource: ResourceEntity | null, resourceDirectory: string): string | null => {
	if (!resource || !resourceDirectory) return null;
	return pathToFileURL(resourceFullPath(resource, resourceDirectory)).href;
};

interface ResolvedItem {
	kind: 'note' | 'resource' | 'unknown';
	title: string;
	body?: string;
	userUpdatedTime?: number;
	deletedTime?: number;
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
						deletedTime: item.deleted_time,
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
	const isInternal = isInternalRef(node.file);
	const url = isInternal
		? resourceUrlFor(resolved?.resource ?? null, ctx.resourceDirectory)
		: (/^(https?:|file:)\/\//i.test(node.file) ? node.file : null);
	const mime = resolved?.resource?.mime;
	const isImage = isInternal
		? !!mime?.startsWith('image/')
		: /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$|#)/i.test(node.file);

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

	const linkedNoteId = resolved?.kind === 'note' ? resolveFileRef(node.file).id : null;
	const linkedNoteUserUpdatedTime = resolved?.kind === 'note' ? resolved.userUpdatedTime : undefined;
	const linkedNoteDeletedTime = resolved?.kind === 'note' ? resolved.deletedTime : undefined;
	const savingRef = useRef(false);
	const onLinkedNoteBodyChange = useCallback(async (newBody: string) => {
		if (!linkedNoteId) return;
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

	const isInTrash = !!resolved?.deletedTime;

	const renderContent = () => {
		if (url && isImage && !isInTrash) {
			return <img className="image" src={url} alt={resolved?.title ?? ''} />;
		}

		if (resolved?.kind === 'note' && !isInTrash) {
			return (
				<>
					<div className="header -note-title" title={resolved.title}>{resolved.title}</div>
					<div ref={checkboxRef} className="wb-card-md body" dangerouslySetInnerHTML={{ __html: noteHtml }} />
				</>
			);
		}

		if (resolved?.kind === 'resource' && !isInTrash) {
			return (
				<>
					<div className="header">{_('File')}</div>
					<div className="body">{resolved.title}</div>
				</>
			);
		}

		if (isInternal && (resolved?.kind === 'unknown' || isInTrash)) {
			return (
				<>
					<div className="header">{_('Linked item')}</div>
					<div className="body -deleted">{_('This linked item has been deleted.')}</div>
				</>
			);
		}

		return (
			<>
				<div className="header">{isInternal ? _('Linked item') : _('File')}</div>
				<div className="body">{resolved === null && isInternal ? _('Loading…') : node.file}</div>
			</>
		);
	};

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={!!selected} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} />
			))}
			<div className={`whiteboard-node ${selected ? '-selected' : ''}`} onDoubleClick={onDoubleClick}>
				{renderContent()}
			</div>
		</>
	);
};

export default FileNode;
