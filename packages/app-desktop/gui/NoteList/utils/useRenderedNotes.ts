import { useState } from 'react';
import { ListRenderer } from '@joplin/lib/services/plugins/api/noteListType';
import { NoteEntity } from '@joplin/lib/services/database/types';
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

const useRenderedNotes = (startNoteIndex: number, endNoteIndex: number, notes: NoteEntity[], selectedNoteIds: string[], listRenderer: ListRenderer, highlightedWords: string[], watchedNoteFiles: string[]) => {
	const [renderedNotes, setRenderedNotes] = useState<Record<string, RenderedNote>>({});

	useAsyncEffect(async (event) => {
		if (event.cancelled) return;

		const renderNote = async (note: NoteEntity): Promise<void> => {
			const isSelected = selectedNoteIds.includes(note.id);
			const isWatched = watchedNoteFiles.includes(note.id);

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
			]);

			if (renderedNotes[note.id] && renderedNotes[note.id].hash === viewHash) return null;

			const titleHtml = getNoteTitleHtml(highlightedWords, Note.displayTitle(note));
			const viewProps = await prepareViewProps(
				listRenderer.dependencies,
				note,
				listRenderer.itemSize,
				isSelected,
				titleHtml,
				isWatched,
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
			promises.push(renderNote(notes[i]));
		}

		await Promise.all(promises);
	}, [startNoteIndex, endNoteIndex, notes, selectedNoteIds, listRenderer, renderedNotes, watchedNoteFiles]);

	return renderedNotes;
};

export default useRenderedNotes;
