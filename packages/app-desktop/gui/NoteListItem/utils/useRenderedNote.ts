import { useState } from 'react';
import { ListRenderer, ListRendererDependency, ListRendererItemValueTemplates, NoteListColumns } from '@joplin/lib/services/plugins/api/noteListType';
import Note from '@joplin/lib/models/Note';
import { NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { createHash } from 'crypto';
import getNoteTitleHtml from './getNoteTitleHtml';
import prepareViewProps from './prepareViewProps';
import * as Mustache from 'mustache';
import Tag from '@joplin/lib/models/Tag';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

const hashContent = (content: any) => {
	return createHash('sha1').update(JSON.stringify(content)).digest('hex');
};

const compileTemplate = (template: string, itemValueTemplates: ListRendererItemValueTemplates, columns: NoteListColumns) => {
	const output: string[] = [];
	for (const column of columns) {
		let valueReplacement = itemValueTemplates[column.name] ? itemValueTemplates[column.name] : '';

		if (!valueReplacement) {
			if (column.name === 'note.titleHtml') {
				valueReplacement = '{{{note.titleHtml}}}';
			} else {
				valueReplacement = `{{${column.name}}}`;
			}
		}

		const style: string[] = [];

		if (column.width) {
			style.push(`width: ${column.width}px`);
		} else {
			style.push('flex: 1');
		}

		const classes = ['item'];
		if (column.name === 'note.title') classes.push('-main');

		output.push(`<div class="${classes.join(' ')}" style="${style.join('; ')}">${template.replace(/{{value}}/g, valueReplacement)}</div>`);
	}

	return output.join('');
};

export default (note: NoteEntity, isSelected: boolean, isWatched: boolean, listRenderer: ListRenderer, highlightedWords: string[], itemIndex: number, columns: NoteListColumns) => {
	const [renderedNote, setRenderedNote] = useState<RenderedNote>(null);

	const dependencies = columns && columns.length ? columns.map(c => c.name) as ListRendererDependency[] : listRenderer.dependencies;

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

			// console.info('RENDER', note.id, renderedNote ? renderedNote.hash : 'NULL', viewHash);

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

			const toRender = listRenderer.multiColumns ? compileTemplate(listRenderer.itemTemplate, listRenderer.itemValueTemplates, columns, listRenderer.dependencies) : listRenderer.itemTemplate;

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
