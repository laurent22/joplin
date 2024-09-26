import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { Provider } from 'react-redux';

import NoteScreen from './Note';
import { MenuProvider } from 'react-native-popup-menu';
import { setupDatabaseAndSynchronizer, switchClient, simulateReadOnlyShareEnv, waitFor } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import initializeCommandService from '../../utils/initializeCommandService';
import { PaperProvider } from 'react-native-paper';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';
import ItemChange from '@joplin/lib/models/ItemChange';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { LayoutChangeEvent } from 'react-native';
import shim from '@joplin/lib/shim';
import getWebViewWindowById from '../../utils/testing/getWebViewWindowById';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';

interface WrapperProps {
}

let store: Store<AppState>;

const WrappedNoteScreen: React.FC<WrapperProps> = _props => {
	return <MenuProvider>
		<PaperProvider>
			<Provider store={store}>
				<NoteScreen />
			</Provider>
		</PaperProvider>
	</MenuProvider>;
};

const getNoteViewerDom = async () => {
	return await getWebViewDomById('NoteBodyViewer');
};

const getNoteEditorControl = async () => {
	const noteEditor = await getWebViewWindowById('NoteEditor');
	const getEditorControl = () => {
		if ('cm' in noteEditor.window && noteEditor.window.cm) {
			return noteEditor.window.cm as CodeMirrorControl;
		}
		return null;
	};
	await waitFor(async () => {
		expect(getEditorControl()).toBeTruthy();
	});
	return getEditorControl();
};

const waitForNoteToMatch = async (noteId: string, note: Partial<NoteEntity>) => {
	await act(() => waitFor(async () => {
		const loadedNote = await Note.load(noteId);
		expect(loadedNote).toMatchObject(note);
	}));
};

const openNewNote = async (noteProperties: NoteEntity) => {
	const note = await Note.save({
		parent_id: (await Folder.defaultFolder()).id,
		...noteProperties,
	});

	const displayParentId = getDisplayParentId(note, await Folder.load(note.parent_id));

	store.dispatch({
		type: 'NOTE_UPDATE_ALL',
		notes: await Note.previews(displayParentId),
	});

	store.dispatch({
		type: 'FOLDER_AND_NOTE_SELECT',
		id: note.id,
		folderId: displayParentId,
	});

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

	await userEvent.press(actionMenuButton);
};

const openEditor = async () => {
	const editButton = await screen.findByLabelText('Edit');
	await userEvent.press(editButton);
};

describe('screens/Note', () => {
	beforeAll(() => {
		// advanceTimers: Needed by internal note save logic
		jest.useFakeTimers({ advanceTimers: true });
	});

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		store = createMockReduxStore();
		initializeCommandService(store);

		// In order for note changes to be saved, note-screen-shared requires
		// that at least one folder exist.
		await Folder.save({ title: 'test', parent_id: '' });
	});

	afterEach(() => {
		screen.unmount();
	});

	it('should show the currently selected note', async () => {
		await openNewNote({ title: 'Test note (title)', body: '# Testing...' });
		render(<WrappedNoteScreen />);

		const titleInput = await screen.findByDisplayValue('Test note (title)');
		expect(titleInput).toBeVisible();

		const renderedNote = await getNoteViewerDom();
		expect(renderedNote.querySelector('h1')).toMatchObject({ textContent: 'Testing...' });
	});

	it('changing the note title input should update the note\'s title', async () => {
		const noteId = await openNewNote({ title: 'Change me!', body: 'Unchanged body' });

		render(<WrappedNoteScreen />);

		const titleInput = await screen.findByDisplayValue('Change me!');

		const user = userEvent.setup();
		await user.clear(titleInput);
		await user.type(titleInput, 'New title');

		await waitForNoteToMatch(noteId, { title: 'New title', body: 'Unchanged body' });

		let expectedTitle = 'New title';
		for (let i = 0; i <= 10; i++) {
			for (const chunk of ['!', ' test', '!!!', ' Testing']) {
				jest.advanceTimersByTime(i % 5);
				await user.type(titleInput, chunk);
				expectedTitle += chunk;
				if (i % 2 === 0) {
					await waitForNoteToMatch(noteId, { title: expectedTitle });
				}
			}
		}
	});

	it('changing the note body in the editor should update the note\'s body', async () => {
		const defaultBody = 'Change me!';
		const noteId = await openNewNote({ title: 'Unchanged title', body: defaultBody });

		const noteScreen = render(<WrappedNoteScreen />);

		await openEditor();
		const editor = await getNoteEditorControl();
		editor.select(defaultBody.length, defaultBody.length);

		editor.insertText(' Testing!!!');
		await waitForNoteToMatch(noteId, { body: 'Change me! Testing!!!' });

		editor.insertText(' This is a test.');
		await waitForNoteToMatch(noteId, { body: 'Change me! Testing!!! This is a test.' });

		// should also save changes made shortly before unmounting
		editor.insertText(' Test!');
		await jest.advanceTimersByTimeAsync(98);

		noteScreen.unmount();
		await waitForNoteToMatch(noteId, { body: 'Change me! Testing!!! This is a test. Test!' });

	});

	it('pressing "delete" should move the note to the trash', async () => {
		const noteId = await openNewNote({ title: 'To be deleted', body: '...' });
		render(<WrappedNoteScreen />);

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Delete');
		fireEvent.press(deleteButton);

		await act(() => waitFor(async () => {
			expect((await Note.load(noteId)).deleted_time).toBeGreaterThan(0);
		}));
	});

	it('pressing "delete permanently" should permanently delete a note', async () => {
		const noteId = await openNewNote({ title: 'To be deleted', body: '...', deleted_time: Date.now() });
		render(<WrappedNoteScreen />);

		// Permanently delete note shows a confirmation dialog -- mock it.
		const deleteId = 0;
		shim.showMessageBox = jest.fn(async () => deleteId);

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Permanently delete note');
		fireEvent.press(deleteButton);

		await act(() => waitFor(async () => {
			expect(await Note.load(noteId)).toBeUndefined();
		}));
		expect(shim.showMessageBox).toHaveBeenCalled();
	});

	it('delete should be disabled in a read-only note', async () => {
		const shareId = 'testShare';
		const noteId = await openNewNote({
			title: 'Title: Read-only note',
			body: 'A **read-only** note.',
			share_id: shareId,
		});
		const cleanup = simulateReadOnlyShareEnv(shareId, store);
		expect(
			itemIsReadOnlySync(
				ModelType.Note,
				ItemChange.SOURCE_UNSPECIFIED,
				await Note.load(noteId) as ItemSlice,
				'',
				BaseItem.syncShareCache,
			),
		).toBe(true);

		render(<WrappedNoteScreen />);

		const titleInput = await screen.findByDisplayValue('Title: Read-only note');
		expect(titleInput).toBeVisible();
		expect(titleInput).toBeDisabled();

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Delete');
		expect(deleteButton).toBeDisabled();

		cleanup();
	});
});
