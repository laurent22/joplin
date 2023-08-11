import { useState } from 'react';
import { ListRenderer, ListRendererDepependency } from './types';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import * as Mustache from 'mustache';

interface RenderedNote {
	id: string;
	html: string;
}

const useRenderedNotes = (notes: NoteEntity[], selectedNoteIds: string[], itemSize: Size, listRenderer: ListRenderer) => {
	const initialValue = notes.map(n => {
		return {
			id: n.id,
			html: '',
		};
	});

	const [renderedNotes, setRenderedNotes] = useState<RenderedNote[]>(initialValue);

	const prepareViewProps = async (dependencies: ListRendererDepependency[], note: NoteEntity, itemSize: Size, selected: boolean) => {
		const output: any = {};
		for (const dep of dependencies) {

			if (dep.startsWith('note.')) {
				const splitted = dep.split('.');
				if (splitted.length !== 2) throw new Error(`Invalid dependency name: ${dep}`);
				const propName = splitted.pop();
				if (!output.note) output.note = {};
				if (!(propName in note)) throw new Error(`Invalid dependency name: ${dep}`);
				output.note[propName] = (note as any)[propName];
			}

			if (dep.startsWith('item.size.')) {
				const splitted = dep.split('.');
				if (splitted.length !== 3) throw new Error(`Invalid dependency name: ${dep}`);
				const propName = splitted.pop();
				if (!output.item) output.item = {};
				if (!output.item.size) output.item.size = {};
				if (!(propName in itemSize)) throw new Error(`Invalid dependency name: ${dep}`);
				output.item.size[propName] = (itemSize as any)[propName];
			}

			if (dep === 'item.selected') {
				if (!output.item) output.item = {};
				output.item.selected = selected;
			}
		}

		return output;
	};

	useAsyncEffect(async (event) => {
		const newRenderedNotes: RenderedNote[] = [];

		for (const note of notes) {
			const view = await listRenderer.onRenderNote(await prepareViewProps(
				listRenderer.dependencies,
				note,
				itemSize,
				selectedNoteIds.includes(note.id)
			));

			newRenderedNotes.push({
				id: note.id,
				html: Mustache.render(listRenderer.itemTemplate, view),
			});
		}

		if (event.cancelled) return null;

		setRenderedNotes(newRenderedNotes);
	}, [notes, selectedNoteIds, itemSize]);

	return renderedNotes;
};

export default useRenderedNotes;
