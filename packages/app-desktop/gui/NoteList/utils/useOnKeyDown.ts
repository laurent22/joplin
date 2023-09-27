import * as React from 'react';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import CommandService from '@joplin/lib/services/CommandService';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import { FocusNote } from './useFocusNote';
import { ItemFlow } from '@joplin/lib/services/plugins/api/noteListType';
import { KeyboardEventKey } from '@joplin/lib/dom';

const useOnKeyDown = (
	selectedNoteIds: string[],
	moveNote: (direction: number, inc: number)=> void,
	makeItemIndexVisible: (itemIndex: number)=> void,
	focusNote: FocusNote,
	notes: NoteEntity[],
	dispatch: Dispatch,
	visibleItemCount: number,
	noteCount: number,
	flow: ItemFlow,
	itemsPerLine: number,
) => {
	const scrollNoteIndex = useCallback((visibleItemCount: number, key: KeyboardEventKey, ctrlKey: boolean, metaKey: boolean, noteIndex: number) => {
		if (flow === ItemFlow.TopToBottom) {
			if (key === 'PageUp') {
				noteIndex -= (visibleItemCount - 1);
			} else if (key === 'PageDown') {
				noteIndex += (visibleItemCount - 1);
			} else if ((key === 'End' && ctrlKey) || (key === 'ArrowDown' && metaKey)) {
				noteIndex = noteCount - 1;
			} else if ((key === 'Home' && ctrlKey) || (key === 'ArrowUp' && metaKey)) {
				noteIndex = 0;
			} else if (key === 'ArrowUp' && !metaKey) {
				noteIndex -= 1;
			} else if (key === 'ArrowDown' && !metaKey) {
				noteIndex += 1;
			}
			if (noteIndex < 0) noteIndex = 0;
			if (noteIndex > noteCount - 1) noteIndex = noteCount - 1;
		}

		if (flow === ItemFlow.LeftToRight) {
			if (key === 'PageUp') {
				noteIndex -= (visibleItemCount - itemsPerLine);
			} else if (key === 'PageDown') {
				noteIndex += (visibleItemCount - itemsPerLine);
			} else if ((key === 'End' && ctrlKey) || (key === 'ArrowDown' && metaKey)) {
				noteIndex = noteCount - 1;
			} else if ((key === 'Home' && ctrlKey) || (key === 'ArrowUp' && metaKey)) {
				noteIndex = 0;
			} else if (key === 'ArrowUp' && !metaKey) {
				noteIndex -= itemsPerLine;
			} else if (key === 'ArrowDown' && !metaKey) {
				noteIndex += itemsPerLine;
			} else if (key === 'ArrowLeft' && !metaKey) {
				noteIndex -= 1;
			} else if (key === 'ArrowRight' && !metaKey) {
				noteIndex += 1;
			}
			if (noteIndex < 0) noteIndex = 0;
			if (noteIndex > noteCount - 1) noteIndex = noteCount - 1;
		}

		return noteIndex;
	}, [noteCount, flow, itemsPerLine]);

	const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback(async (event) => {
		const noteIds = selectedNoteIds;
		const key = event.key as KeyboardEventKey;

		if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(key) && event.altKey) {
			if (flow === ItemFlow.TopToBottom) {
				await moveNote(key === 'ArrowDown' ? 1 : -1, 1);
			} else {
				if (key === 'ArrowRight') {
					await moveNote(1, 1);
				} else if (key === 'ArrowLeft') {
					await moveNote(-1, 1);
				} else if (key === 'ArrowUp') {
					await moveNote(-1, itemsPerLine);
				} else if (key === 'ArrowDown') {
					await moveNote(1, itemsPerLine);
				}
			}
			event.preventDefault();
		} else if (noteIds.length > 0 && (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'PageDown' || key === 'PageUp' || key === 'End' || key === 'Home')) {
			const noteId = noteIds[0];
			let noteIndex = BaseModel.modelIndexById(notes, noteId);

			noteIndex = scrollNoteIndex(visibleItemCount, key, event.ctrlKey, event.metaKey, noteIndex);

			const newSelectedNote = notes[noteIndex];

			dispatch({
				type: 'NOTE_SELECT',
				id: newSelectedNote.id,
			});

			makeItemIndexVisible(noteIndex);

			focusNote(newSelectedNote.id);

			event.preventDefault();
		}

		if (noteIds.length && (key === 'Delete' || (key === 'Backspace' && event.metaKey))) {
			event.preventDefault();
			void CommandService.instance().execute('deleteNote', noteIds);
		}

		if (noteIds.length && key === ' ') {
			event.preventDefault();

			const selectedNotes = BaseModel.modelsByIds(notes, noteIds);
			const todos = selectedNotes.filter((n: any) => !!n.is_todo);
			if (!todos.length) return;

			for (let i = 0; i < todos.length; i++) {
				const toggledTodo = Note.toggleTodoCompleted(todos[i]);
				await Note.save(toggledTodo);
			}

			focusNote(todos[0].id);
		}

		if (key === 'Tab') {
			event.preventDefault();

			if (event.shiftKey) {
				void CommandService.instance().execute('focusElement', 'sideBar');
			} else {
				void CommandService.instance().execute('focusElement', 'noteTitle');
			}
		}

		if (key.toUpperCase() === 'A' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();

			dispatch({
				type: 'NOTE_SELECT_ALL',
			});
		}
	}, [moveNote, focusNote, visibleItemCount, scrollNoteIndex, makeItemIndexVisible, notes, selectedNoteIds, dispatch, flow, itemsPerLine]);


	return onKeyDown;
};

export default useOnKeyDown;
