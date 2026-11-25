import { LayoutChangeEvent } from 'react-native';
import { Store } from 'redux';
import { act, screen, userEvent, waitFor } from '../../../utils/testing/testingLibrary';
import { runWithFakeTimers } from '@joplin/lib/testing/test-utils';
import waitForWithRealTimers from '@joplin/lib/testing/waitFor';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { AppState } from '../../../utils/types';

export function deferred<T>() {
	let resolve: (value: T)=> void;
	const promise = new Promise<T>(resolvePromise => {
		resolve = resolvePromise;
	});
	return { promise, resolve: resolve! };
}

export const createNoteTestHelpers = (getStore: ()=> Store<AppState>) => {
	const waitForNoteToMatch = async (noteId: string, note: Partial<NoteEntity>) => {
		await act(() => waitForWithRealTimers(async () => {
			const loadedNote = await Note.load(noteId);
			expect(loadedNote).toMatchObject(note);
		}));
	};

	const openExistingNote = async (noteId: string) => {
		const note = await Note.load(noteId);
		const displayParentId = getDisplayParentId(note, await Folder.load(note.parent_id));

		getStore().dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: await Note.previews(displayParentId),
		});

		getStore().dispatch({
			type: 'FOLDER_AND_NOTE_SELECT',
			id: note.id,
			folderId: displayParentId,
		});
	};

	const openNewNote = async (noteProperties: NoteEntity) => {
		const note = await Note.save({
			parent_id: (await Folder.defaultFolder()).id,
			...noteProperties,
		});

		await openExistingNote(note.id);
		await waitForNoteToMatch(note.id, { parent_id: note.parent_id, title: note.title, body: note.body });

		return note.id;
	};

	const openNoteActionsMenu = async () => {
		// It doesn't seem possible to find the menu trigger with role/label.
		const actionMenuButton = await screen.findByTestId('screen-header-menu-trigger');

		// react-native-action-menu only shows the menu content after receiving onLayout
		// events from various components (including a View that wraps the screen).
		let cursor = actionMenuButton;
		while (cursor.parent) {
			if (cursor.props.onLayout) {
				const mockedEvent = { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 100 } } };
				cursor.props.onLayout(mockedEvent as LayoutChangeEvent);
			}
			cursor = cursor.parent;
		}

		// act() rather than waitFor(): waitFor rejects if the timer mode changes while it polls, and
		// draining the fake timers updates the menu drawer's state.
		await act(async () => {
			await runWithFakeTimers(async () => {
				await userEvent.press(actionMenuButton);
			});
		});

		// State can update until the menu content is marked as open (part of the
		// menu transition).
		await waitFor(async () => {
			expect(await screen.findByTestId('menu-content-open')).toBeVisible();
		});
	};

	return { waitForNoteToMatch, openExistingNote, openNewNote, openNoteActionsMenu };
};
