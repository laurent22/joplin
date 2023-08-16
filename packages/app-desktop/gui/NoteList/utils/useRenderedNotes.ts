import { useState } from 'react';
import { ListRenderer } from './types';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import * as Mustache from 'mustache';
import { createHash } from 'crypto';
import getNoteTitleHtml from './getNoteTitleHtml';
import Note from '@joplin/lib/models/Note';
import prepareViewProps from './prepareViewProps';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

const hashContent = (content: any) => {
	return createHash('sha1').update(JSON.stringify(content)).digest('hex');
};

const useRenderedNotes = (startNoteIndex: number, endNoteIndex: number, notes: NoteEntity[], selectedNoteIds: string[], itemSize: Size, listRenderer: ListRenderer, highlightedWords: string[], watchedNoteFiles: string[]) => {
	const [renderedNotes, setRenderedNotes] = useState<Record<string, RenderedNote>>({});

	useAsyncEffect(async (event) => {
		const noteIds = notes.filter((_value, index) => {
			return index >= startNoteIndex && index <= endNoteIndex;
		}).map(note => note.id);

		const fullNotes = await Note.loadItemsByIds(noteIds);
		if (event.cancelled) return;

		const renderNote = async (note: NoteEntity, noteIndex: number): Promise<void> => {
			const titleHtml = getNoteTitleHtml(highlightedWords, Note.displayTitle(note));
			const viewProps = await prepareViewProps(
				listRenderer.dependencies,
				note,
				itemSize,
				selectedNoteIds.includes(note.id),
				noteIndex,
				titleHtml,
				watchedNoteFiles.includes(note.id)
			);
			const view = await listRenderer.onRenderNote(viewProps);

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

		for (let i = 0; i < fullNotes.length; i++) {
			promises.push(renderNote(fullNotes[i], i));
		}

		await Promise.all(promises);
	}, [startNoteIndex, endNoteIndex, notes, selectedNoteIds, itemSize, listRenderer, watchedNoteFiles]);

	return renderedNotes;
};

export default useRenderedNotes;
