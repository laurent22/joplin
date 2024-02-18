import { useState } from 'react';
import { ListRenderer, ListRendererDependency, NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import Note from '@joplin/lib/models/Note';
import { NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import compileTemplate from '@joplin/lib/services/noteList/compileTemplate';
import { createHash } from 'crypto';
import getNoteTitleHtml from './getNoteTitleHtml';
import prepareViewProps from './prepareViewProps';
import * as Mustache from 'mustache';
import Tag from '@joplin/lib/models/Tag';
import { unique } from '@joplin/lib/array';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

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

			if (dependencies.includes('note.tags')) {
				noteTags = await Tag.tagsByNoteId(note.id, { fields: ['id', 'title'] });
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
			]);

			if (renderedNote && renderedNote.hash === viewHash) return null;

			const titleHtml = getNoteTitleHtml(highlightedWords, Note.displayTitle(note));
			const viewProps = await prepareViewProps(
				dependencies,
				note,
				listRenderer.itemSize,
				isSelected,
				titleHtml,
				isWatched,
				noteTags,
				itemIndex,
			);

			if (event.cancelled) return null;

			const view = await listRenderer.onRenderNote(viewProps);

			if (event.cancelled) return null;

			const toRender = listRenderer.multiColumns ? compileTemplate(listRenderer.itemTemplate, listRenderer.itemValueTemplates, columns) : listRenderer.itemTemplate;

			setRenderedNote({
				id: note.id,
				hash: viewHash,
				html: Mustache.render(toRender, view),
			});
		};

		void renderNote();
	}, [note, isSelected, isWatched, listRenderer, renderedNote, columns]);

	return renderedNote;
};
