import * as React from 'react';
import type * as ReactNative from 'react-native';

import { describe, it, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { Provider } from 'react-redux';

import NoteScreen from './Note';
import { MenuProvider } from 'react-native-popup-menu';
import { runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import initializeCommandService from '../../utils/initializeCommandService';
import { PaperProvider } from 'react-native-paper';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import shim from '@joplin/lib/shim';

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

const openNewNote = async (noteProperties: NoteEntity) => {
	const note = await Note.save({
		parent_id: (await Folder.defaultFolder()).id,
		...noteProperties,
	});

	store.dispatch({
		type: 'FOLDER_AND_NOTE_SELECT',
		id: note.id,
		folderId: getDisplayParentId(note, await Folder.load(note.parent_id)),
	});
	return note.id;
};

// Required to test react-native-popup-menu. See
// https://github.com/instea/react-native-popup-menu/issues/197#issuecomment-2237691505
jest.mock('react-native', () => {
	const reactNative = jest.requireActual<typeof ReactNative>('react-native');
	const ViewMock = class extends reactNative.View {
		public constructor(props: ReactNative.ViewProps) {
			super(props);

			if (this.props.onLayout) {
				const mockedEvent = { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 100 } } };
				this.props.onLayout(mockedEvent as ReactNative.LayoutChangeEvent);
			}
		}

		public measure = (callback: ReactNative.MeasureOnSuccessCallback) => {
			callback(0, 0, 120, 100, 0, 0);
		};
	};

	// Use a Proxy to avoid warnings -- react-native warns when attempting to access
	// properties that correspond to deprecated APIs.
	return new Proxy(reactNative, {
		get(target, property) {
			if (property === 'View') {
				return ViewMock;
			}
			return target[property as keyof typeof ReactNative];
		},
	});
});

const openNoteActionsMenu = async () => {
	// It doesn't seem possible to find the menu trigger with role/label.
	const actionMenuButton = await screen.findByTestId('screen-header-menu-trigger');
	await runWithFakeTimers(() => userEvent.press(actionMenuButton));
};

describe('Note', () => {
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
		// We need to use fake timers while using userEvent to avoid warnings:
		await runWithFakeTimers(async () => {
			const user = userEvent.setup();
			await user.clear(titleInput);
			await user.type(titleInput, 'New title');
		});

		await waitFor(async () => {
			expect(await Note.load(noteId)).toMatchObject({ title: 'New title', body: 'Unchanged body' });
		});
	});

	it('pressing "delete" should move the note to the trash', async () => {
		const noteId = await openNewNote({ title: 'To be deleted', body: '...' });
		render(<WrappedNoteScreen />);

		await openNoteActionsMenu();
		const deleteButton = await screen.findByText('Delete note');
		fireEvent.press(deleteButton);

		await waitFor(async () => {
			expect((await Note.load(noteId)).deleted_time).toBeGreaterThan(0);
		});
	});

	it('should offer to permanently delete notes already in the trash', async () => {
		const noteId = await openNewNote({ title: 'To be deleted', body: '...', deleted_time: Date.now() });

		render(<WrappedNoteScreen />);

		await openNoteActionsMenu();

		const permanentDeleteButton = await screen.findByText('Permanently delete note');
		shim.showMessageBox = jest.fn(
			async (_message, options) => (options.buttons ?? []).indexOf('Delete'),
		);
		fireEvent.press(permanentDeleteButton);

		await waitFor(async () => {
			expect(shim.showMessageBox).toHaveBeenCalled();
			expect(await Note.load(noteId) ?? null).toBe(null);
		});
	});
});
