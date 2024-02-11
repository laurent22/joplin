import { useState } from 'react';
import { ListRenderer, ListRendererDependency, ListRendererItemTemplate } from '@joplin/lib/services/plugins/api/noteListType';
import Note from '@joplin/lib/models/Note';
import { NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { createHash } from 'crypto';
import getNoteTitleHtml from './getNoteTitleHtml';
import prepareViewProps from './prepareViewProps';
import * as Mustache from 'mustache';
import Tag from '@joplin/lib/models/Tag';
import { Column } from '../../NoteList/utils/types';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

const hashContent = (content: any) => {
	return createHash('sha1').update(JSON.stringify(content)).digest('hex');
};

// TODO: Add tests
const compileTemplate = (template: ListRendererItemTemplate, columns: Column[], dependencies: ListRendererDependency[]) => {
	if (typeof template === 'string') return template;

	const output: string[] = [];
	for (const column of columns) {
		const name = template[column.name] ? column.name : '';
		let t = template[name];

		if (name === '') {
			if (column.name === 'note.title' && dependencies.includes('note.titleHtml')) {
				t = t.replace(/{{value}}/g, '{{{note.titleHtml}}}');
			} else {
				t = t.replace(/{{value}}/g, `{{${column.name}}}`);
			}
		}

		output.push(`<div class="item">${t}</div>`);
	}
	return output.join('');
};

export default (note: NoteEntity, isSelected: boolean, isWatched: boolean, listRenderer: ListRenderer, highlightedWords: string[], itemIndex: number, columns: Column[]) => {
	const [renderedNote, setRenderedNote] = useState<RenderedNote>(null);

	useAsyncEffect(async (event) => {
		const renderNote = async (): Promise<void> => {
			let noteTags: TagEntity[] = [];

			if (listRenderer.dependencies.includes('note.tags')) {
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
				noteTags.map(t => t.title).sort().join(','),
			]);

			if (renderedNote && renderedNote.hash === viewHash) return null;

			// console.info('RENDER', note.id, renderedNote ? renderedNote.hash : 'NULL', viewHash);

			const titleHtml = getNoteTitleHtml(highlightedWords, Note.displayTitle(note));
			const viewProps = await prepareViewProps(
				listRenderer.dependencies,
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

			const toRender = compileTemplate(listRenderer.itemTemplate, columns, listRenderer.dependencies);

			setRenderedNote({
				id: note.id,
				hash: viewHash,
				html: Mustache.render(toRender, view),
			});
		};

		void renderNote();
	}, [note, isSelected, isWatched, listRenderer, renderedNote]);

	return renderedNote;
};
