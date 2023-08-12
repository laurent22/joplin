import { useState } from 'react';
import { ListRenderer, ListRendererDepependency } from './types';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import * as Mustache from 'mustache';
import { createHash } from 'crypto';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

const hashContent = (content: any) => {
	return createHash('sha1').update(JSON.stringify(content)).digest('hex');
};

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

const useRenderedNotes = (startNoteIndex: number, endNoteIndex: number, notes: NoteEntity[], selectedNoteIds: string[], itemSize: Size, listRenderer: ListRenderer) => {
	const [renderedNotes, setRenderedNotes] = useState<Record<string, RenderedNote>>({});

	useAsyncEffect(async (event) => {
		const renderNote = async (note: NoteEntity): Promise<void> => {
			const view = await listRenderer.onRenderNote(await prepareViewProps(
				listRenderer.dependencies,
				note,
				itemSize,
				selectedNoteIds.includes(note.id)
			));

			if (event.cancelled) return null;

			const viewHash = hashContent(view);

			setRenderedNotes(prev => {
				if (prev[note.id] && prev[note.id].hash === viewHash) return prev;

				return {
					...prev,
					[note.id]: {
						id: note.id,
						hash: viewHash,
						html: Mustache.render(listRenderer.itemTemplate, view),
					},
				};
			});
		};

		const promises: Promise<void>[] = [];

		for (let i = startNoteIndex; i <= endNoteIndex; i++) {
			const note = notes[i];
			promises.push(renderNote(note));
		}

		await Promise.all(promises);
	}, [startNoteIndex, endNoteIndex, notes, selectedNoteIds, itemSize, listRenderer]);

	return renderedNotes;
};

export default useRenderedNotes;
