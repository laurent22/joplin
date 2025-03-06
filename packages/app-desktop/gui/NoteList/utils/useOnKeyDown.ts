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
import announceForAccessibility from '../../utils/announceForAccessibility';
import { _ } from '@joplin/lib/locale';

const useOnKeyDown = (
	activeNoteId: string,
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
	showCompletedTodos: boolean,
	uncompletedTodosOnTop: boolean,
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
		} else if (notes.length > 0 && (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'PageDown' || key === 'PageUp' || key === 'End' || key === 'Home')) {
			const noteId = activeNoteId ?? notes[0]?.id;
			let noteIndex = BaseModel.modelIndexById(notes, noteId);

			noteIndex = scrollNoteIndex(visibleItemCount, key, event.ctrlKey, event.metaKey, noteIndex);

			const newSelectedNote = notes[noteIndex];

			if (event.shiftKey) {
				if (selectedNoteIds.includes(newSelectedNote.id)) {
					dispatch({
						type: 'NOTE_SELECT_REMOVE',
						id: noteId,
					});
				}

				dispatch({
					type: 'NOTE_SELECT_ADD',
					id: newSelectedNote.id,
				});
			} else {
				dispatch({
					type: 'NOTE_SELECT',
					id: newSelectedNote.id,
				});
			}

			makeItemIndexVisible(noteIndex);

			focusNote(newSelectedNote.id);

			event.preventDefault();
		}

		if (noteIds.length) {
			if (key === 'Delete' && event.shiftKey || (key === 'Backspace' && event.metaKey && event.altKey)) {
				event.preventDefault();
				if (CommandService.instance().isEnabled('permanentlyDeleteNote')) {
					void CommandService.instance().execute('permanentlyDeleteNote', noteIds);
				}
			} else if (key === 'Delete' || (key === 'Backspace' && event.metaKey)) {
				event.preventDefault();
				if (CommandService.instance().isEnabled('deleteNote')) {
					void CommandService.instance().execute('deleteNote', noteIds);
				}
			}
		}

		if (noteIds.length && key === ' ') {
			event.preventDefault();

			const selectedNotes = BaseModel.modelsByIds(notes, noteIds);
			const todos = selectedNotes.filter(n => !!n.is_todo);
			if (!todos.length) return;

			const firstNoteIndex = notes.findIndex(n => n.id === todos[0].id);
			let nextSelectedNoteIndex = firstNoteIndex + 1;
			if (nextSelectedNoteIndex > notes.length - 1) nextSelectedNoteIndex = notes.length - 1;
			const nextSelectedNote = nextSelectedNoteIndex >= 0 ? notes[nextSelectedNoteIndex] : todos[0];

			for (let i = 0; i < todos.length; i++) {
				const toggledTodo = Note.toggleTodoCompleted(todos[i]);
				await Note.save(toggledTodo);
			}

			// When the settings `uncompletedTodosOnTop` or `showCompletedTodos` are enabled, the
			// note that got set as completed or uncompleted is going to disappear from view,
			// possibly hidden or moved to the top or bottom of the note list. It is assumed that
			// the user does not want to keep that note selected since the to-do is indeed
			// "completed". And by keeping that selection, the cursor would jump, making you lose
			// context if you have multiple to-dos that need to be ticked. For that reason we set
			// the selection to the next note in the list, which also ensures that the scroll
			// position doesn't change. This is the same behaviour as when deleting a note.
			const maintainScrollPosition = !showCompletedTodos || uncompletedTodosOnTop;

			if (maintainScrollPosition) {
				dispatch({ type: 'NOTE_SELECT', noteId: nextSelectedNote.id });
			}

			dispatch({ type: 'NOTE_SORT' });
			if (!maintainScrollPosition) focusNote(todos[0].id);
			const wasCompleted = !!todos[0].todo_completed;
			announceForAccessibility(!wasCompleted ? _('Complete') : _('Incomplete'));
		}

		// Check for isDefaultPrevented to allow plugins to call .preventDefault
		if (key === 'Enter' && !event.isDefaultPrevented()) {
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
	}, [moveNote, focusNote, visibleItemCount, scrollNoteIndex, makeItemIndexVisible, notes, selectedNoteIds, activeNoteId, dispatch, flow, itemsPerLine, showCompletedTodos, uncompletedTodosOnTop]);


	return onKeyDown;
};

export default useOnKeyDown;
