import { useState } from 'react';
import { ListRenderer, ListRendererDependency, NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import Note from '@joplin/lib/models/Note';
import { FolderEntity, NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import renderTemplate from '@joplin/lib/services/noteList/renderTemplate';
import renderViewProps from '@joplin/lib/services/noteList/renderViewProps';
import { createHash } from 'crypto';
import getNoteTitleHtml from './getNoteTitleHtml';
import prepareViewProps from './prepareViewProps';
import Tag from '@joplin/lib/models/Tag';
import { unique } from '@joplin/lib/array';
import Folder from '@joplin/lib/models/Folder';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const hashContent = (content: any) => {
	return createHash('sha1').update(JSON.stringify(content)).digest('hex');
};

export default (note: NoteEntity, isSelected: boolean, isWatched: boolean, listRenderer: ListRenderer, highlightedWords: string[], itemIndex: number, columns: NoteListColumns) => {
	const [renderedNote, setRenderedNote] = useState<RenderedNote>(null);

	let dependencies = columns && columns.length ? columns.map(c => c.name) as ListRendererDependency[] : [];
	if (listRenderer.dependencies) dependencies = dependencies.concat(listRenderer.dependencies);
	dependencies = unique(dependencies);

	useAsyncEffect(async (event) => {
		const renderNote = async (): Promise<void> => {
			let noteTags: TagEntity[] = [];
			let folder: FolderEntity = null;

			if (dependencies.includes('note.tags')) {
				noteTags = await Tag.tagsByNoteId(note.id, { fields: ['id', 'title'] });
			}

			if (dependencies.find(d => d.startsWith('note.folder'))) {
				folder = await Folder.load(note.parent_id, { fields: ['id', 'title'] });
			}

			// Note: with this hash we're assuming that the list renderer
			// properties never changes. It means that later if we support
			// dynamic list renderers, we should include these into the hash.
			const viewHash = hashContent([
				listRenderer.id,
				note.updated_time,
				isSelected,
				isWatched,
				highlightedWords,
				note.encryption_applied,
				JSON.stringify(columns),
				noteTags.map(t => t.title).sort().join(','),
				folder ? folder.title : '',
			]);

			if (renderedNote && renderedNote.hash === viewHash) return null;

			const noteTitleHtml = getNoteTitleHtml(highlightedWords, Note.displayTitle(note));

			const viewProps = await prepareViewProps(
				dependencies,
				note,
				listRenderer.itemSize,
				isSelected,
				noteTitleHtml,
				isWatched,
				noteTags,
				folder,
				itemIndex,
			);

			if (event.cancelled) return null;

			const view = await listRenderer.onRenderNote(viewProps);

			if (event.cancelled) return null;

			await renderViewProps(view, [], { noteTitleHtml });

			if (event.cancelled) return null;

			setRenderedNote({
				id: note.id,
				hash: viewHash,
				html: renderTemplate(
					columns,
					listRenderer.itemTemplate,
					listRenderer.itemValueTemplates,
					view,
				),
			});
		};

		void renderNote();
	}, [note, isSelected, isWatched, listRenderer, renderedNote, columns]);

	return renderedNote;
};
