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
		if (event.cancelled) return;

		const renderNote = async (note: NoteEntity, noteIndex: number): Promise<void> => {
			const viewHash = hashContent({
				...listRenderer.dependencies,
				updated_time: note.updated_time,
			});

			if (renderedNotes[note.id] && renderedNotes[note.id].hash === viewHash) return null;

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
			promises.push(renderNote(notes[i], i));
		}

		await Promise.all(promises);
	}, [startNoteIndex, endNoteIndex, notes, selectedNoteIds, itemSize, listRenderer, renderedNotes, watchedNoteFiles]);

	return renderedNotes;
};

export default useRenderedNotes;
