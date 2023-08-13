import * as React from 'react';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import CommandService from '@joplin/lib/services/CommandService';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import { FocusNote } from './useFocusNote';

const useOnKeyDown = (
	selectedNoteIds: string[],
	moveNote: (direction: number)=> void,
	scrollNoteIndex: (visibleItemCount: number, keyCode: number, ctrlKey: boolean, metaKey: boolean, noteIndex: number)=> number,
	makeItemIndexVisible: (itemIndex: number)=> void,
	focusNote: FocusNote,
	notes: NoteEntity[],
	dispatch: Dispatch,
	visibleItemCount: number
) => {
	const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback(async (event) => {
		const keyCode = event.keyCode;
		const noteIds = selectedNoteIds;

		if ((keyCode === 40 || keyCode === 38) && event.altKey) {
			// (DOWN / UP) & ALT
			await moveNote(keyCode === 40 ? 1 : -1);
			event.preventDefault();
		} else if (noteIds.length > 0 && (keyCode === 40 || keyCode === 38 || keyCode === 33 || keyCode === 34 || keyCode === 35 || keyCode === 36)) {
			// DOWN / UP / PAGEDOWN / PAGEUP / END / HOME
			const noteId = noteIds[0];
			let noteIndex = BaseModel.modelIndexById(notes, noteId);

			noteIndex = scrollNoteIndex(visibleItemCount, keyCode, event.ctrlKey, event.metaKey, noteIndex);

			const newSelectedNote = notes[noteIndex];

			dispatch({
				type: 'NOTE_SELECT',
				id: newSelectedNote.id,
			});

			makeItemIndexVisible(noteIndex);

			focusNote(newSelectedNote.id);

			event.preventDefault();
		}

		if (noteIds.length && (keyCode === 46 || (keyCode === 8 && event.metaKey))) {
			// DELETE / CMD+Backspace
			event.preventDefault();
			void CommandService.instance().execute('deleteNote', noteIds);
		}

		if (noteIds.length && keyCode === 32) {
			// SPACE
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

		if (keyCode === 9) {
			// TAB
			event.preventDefault();

			if (event.shiftKey) {
				void CommandService.instance().execute('focusElement', 'sideBar');
			} else {
				void CommandService.instance().execute('focusElement', 'noteTitle');
			}
		}

		if (event.keyCode === 65 && (event.ctrlKey || event.metaKey)) {
			// Ctrl+A key
			event.preventDefault();

			dispatch({
				type: 'NOTE_SELECT_ALL',
			});
		}
	}, [moveNote, focusNote, visibleItemCount, scrollNoteIndex, makeItemIndexVisible, notes, selectedNoteIds, dispatch]);


	return onKeyDown;
};

export default useOnKeyDown;
