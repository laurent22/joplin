import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { act, fireEvent, render, screen, userEvent, waitFor } from '../../../utils/testing/testingLibrary';

import NoteScreen from './Note';
import { setupDatabaseAndSynchronizer, switchClient, simulateReadOnlyShareEnv, supportDir, synchronizerStart, resourceFetcher, runWithFakeTimers } from '@joplin/lib/testing/test-utils';
import { waitFor as waitForWithRealTimers } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import { AppState } from '../../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import getWebViewDomById from '../../../utils/testing/getWebViewDomById';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';
import ItemChange from '@joplin/lib/models/ItemChange';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { LayoutChangeEvent } from 'react-native';
import shim from '@joplin/lib/shim';
import getWebViewWindowById from '../../../utils/testing/getWebViewWindowById';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import Setting from '@joplin/lib/models/Setting';
import Resource from '@joplin/lib/models/Resource';
import TestProviderStack from '../../testing/TestProviderStack';
import setupGlobalStore from '../../../utils/testing/setupGlobalStore';
import CommandService from '@joplin/lib/services/CommandService';

jest.retryTimes(2);

interface WrapperProps {
}

let store: Store<AppState>;

const mockNavigation = { state: { } };
const WrappedNoteScreen: React.FC<WrapperProps> = _props => {
	return <TestProviderStack store={store}>
		<NoteScreen navigation={mockNavigation}/>
	</TestProviderStack>;
};

const getNoteViewerDom = async () => {
	return await getWebViewDomById('NoteBodyViewer');
};

const getMarkdownEditorControl = async () => {
	const noteEditor = await getWebViewWindowById('MarkdownEditor');
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
	await act(() => waitForWithRealTimers(async () => {
		const loadedNote = await Note.load(noteId);
		expect(loadedNote).toMatchObject(note);
	}));
};

const openExistingNote = async (noteId: string) => {
	const note = await Note.load(noteId);
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

	// Wrap in act(...) -- this tells the test library that component state is intended to update (prevents
	// warnings).
	await waitFor(async () => {
		await runWithFakeTimers(async () => {
			await userEvent.press(actionMenuButton);
		});

		// State can update until the menu content is marked as open (part of the
		// menu transition).
		await waitFor(async () => {
			expect(await screen.findByTestId('menu-content-open')).toBeVisible();
		});
	});
};

const expectToBeEditing = async (editing: boolean) => {
	await waitFor(() => {
		const editButton = screen.queryByLabelText('Edit');
		if (editing) {
			expect(editButton).toBeNull();
		} else {
			expect(editButton).not.toBeNull();
		}
	});
};

const openEditor = async () => {
	const editButton = await screen.findByLabelText('Edit');

	fireEvent.press(editButton);
	await expectToBeEditing(true);
};

const runEditorCommand = async (commandName: string) => {
	await act(() => {
		return CommandService.instance().execute(commandName);
	});
};

describe('screens/Note', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		store = createMockReduxStore();
		setupGlobalStore(store);

		// In order for note changes to be saved, note-screen-shared requires
		// that at least one folder exist.
		await Folder.save({ title: 'test', parent_id: '' });
		jest.useRealTimers();
	});

	it('should show the currently selected note', async () => {
		await openNewNote({ title: 'Test note (title)', body: '# Testing...' });
		const { unmount } = render(<WrappedNoteScreen />);

		const titleInput = await screen.findByDisplayValue('Test note (title)');
		expect(titleInput).toBeVisible();

		const renderedNote = await getNoteViewerDom();
		expect(renderedNote.querySelector('h1')).toMatchObject({ textContent: 'Testing...' });

		unmount();
	});

	it('changing the note title input should update the note\'s title', async () => {
		const noteId = await openNewNote({ title: 'Change me!', body: 'Unchanged body' });

		const { unmount } = render(<WrappedNoteScreen />);

		const titleInput = await screen.findByDisplayValue('Change me!');

		const user = userEvent.setup();
		await user.clear(titleInput);
		await user.type(titleInput, 'New title');

		await waitForNoteToMatch(noteId, { title: 'New title', body: 'Unchanged body' });

		// Use fake timers to allow advancing timers without pausing the test
		await runWithFakeTimers(async () => {
			let expectedTitle = 'New title';
			for (let i = 0; i <= 10; i++) {
				for (const chunk of ['!', ' test', '!!!', ' Testing']) {
					jest.advanceTimersByTime(i % 5);
					await user.type(titleInput, chunk);
					expectedTitle += chunk;

					// Don't verify after each input event -- this allows the save action queue to fill.
					if (i % 4 === 0) {
						await waitForNoteToMatch(noteId, { title: expectedTitle });
					}
				}
				await waitForNoteToMatch(noteId, { title: expectedTitle });
			}
		});

		unmount();
	});

	it('changing the note body in the editor should update the note\'s body', async () => {
		const defaultBody = 'Change me!';
		const noteId = await openNewNote({ title: 'Unchanged title', body: defaultBody });

		const noteScreen = render(<WrappedNoteScreen />);
		await openEditor();
		const editor = await getMarkdownEditorControl();
		await act(async () => {
			editor.select(defaultBody.length, defaultBody.length);
			editor.insertText(' Testing!!!');

			expect(editor.editor.state.doc.toString()).toBe('Change me! Testing!!!');
		});

		await waitForNoteToMatch(noteId, { body: 'Change me! Testing!!!' });

		await act(async () => {
			editor.insertText(' This is a test.');
			await waitForNoteToMatch(noteId, { body: 'Change me! Testing!!! This is a test.' });

			// should also save changes made shortly before unmounting
			editor.insertText(' Test!');

			noteScreen.unmount();
			await waitForNoteToMatch(noteId, { body: 'Change me! Testing!!! This is a test. Test!' });
		});
	});

	it('pressing "delete" should move the note to the trash', async () => {
		const noteId = await openNewNote({ title: 'To be deleted', body: '...' });
		const { unmount } = render(<WrappedNoteScreen />);

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Delete');
		fireEvent.press(deleteButton);

		await waitFor(async () => {
			expect((await Note.load(noteId)).deleted_time).toBeGreaterThan(0);
		});

		unmount();
	});

	it('pressing "delete permanently" should permanently delete a note', async () => {
		const noteId = await openNewNote({ title: 'To be deleted', body: '...', deleted_time: Date.now() });
		const { unmount } = render(<WrappedNoteScreen />);

		// Permanently delete note shows a confirmation dialog -- mock it.
		const deleteId = 0;
		shim.showMessageBox = jest.fn(async () => deleteId);

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Permanently delete note');
		fireEvent.press(deleteButton);

		await waitFor(async () => {
			expect(await Note.load(noteId)).toBeUndefined();
		});
		expect(shim.showMessageBox).toHaveBeenCalled();

		unmount();
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

		const { unmount } = render(<WrappedNoteScreen />);

		const titleInput = await screen.findByDisplayValue('Title: Read-only note');
		expect(titleInput).toBeVisible();
		expect(titleInput).toBeDisabled();

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Delete');
		expect(deleteButton).toHaveProp('disabled', true);

		act(() => cleanup());
		unmount();
	});

	it.each([
		'auto',
		'manual',
	])('should correctly auto-download or not auto-download resources in %j mode', async (downloadMode) => {
		let note = await Note.save({ title: 'Note 1', parent_id: (await Folder.defaultFolder()).id });
		note = await shim.attachFileToNote(note, `${supportDir}/photo.jpg`);

		await synchronizerStart();
		await switchClient(1);
		Setting.setValue('sync.resourceDownloadMode', downloadMode);
		await synchronizerStart();

		// Before opening the note, the resource should not be marked for download
		const allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		const resource = allResources[0];
		expect(await Resource.localState(resource)).toMatchObject({ fetch_status: Resource.FETCH_STATUS_IDLE });

		await openExistingNote(note.id);

		const { unmount } = render(<WrappedNoteScreen />);

		// Note should render
		const titleInput = await screen.findByDisplayValue('Note 1');
		expect(titleInput).toBeVisible();

		// Wrap in act() -- the component may update in the background during this.
		await act(async () => {
			await resourceFetcher().waitForAllFinished();

			// After opening the note, the resource should be marked for download only in automatic mode
			if (downloadMode === 'auto') {
				await waitFor(async () => {
					expect(await Resource.localState(resource.id)).toMatchObject({ fetch_status: Resource.FETCH_STATUS_DONE });
				});
			} else if (downloadMode === 'manual') {
				// In manual mode, should not mark for download
				expect(await Resource.localState(resource)).toMatchObject({ fetch_status: Resource.FETCH_STATUS_IDLE });
			} else {
				throw new Error(`Should not be testing downloadMode: ${downloadMode}.`);
			}
		});

		unmount();
	});

	it('the toggleVisiblePanes command should start and stop editing', async () => {
		await openNewNote({ title: 'To be edited', body: '...' });
		const { unmount } = render(<WrappedNoteScreen />);

		await expectToBeEditing(false);
		await runEditorCommand('toggleVisiblePanes');
		await expectToBeEditing(true);
		await runEditorCommand('toggleVisiblePanes');
		await expectToBeEditing(false);

		unmount();
	});
});
