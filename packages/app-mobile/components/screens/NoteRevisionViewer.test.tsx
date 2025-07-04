import * as React from 'react';
import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import NoteRevisionViewer from './NoteRevisionViewer';
import { setupDatabaseAndSynchronizer, switchClient, revisionService } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import { fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import Note from '@joplin/lib/models/Note';
import { useMemo } from 'react';
import Revision from '@joplin/lib/models/Revision';
import { ModelType } from '@joplin/lib/BaseModel';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';

interface WrapperProps {
	noteId: string;
}

let store: Store<AppState>;
const WrappedRevisionViewerScreen: React.FC<WrapperProps> = ({ noteId }) => {
	const navigationState = useMemo(() => ({
		state: { noteId },
	}), [noteId]);

	return <TestProviderStack store={store}>
		<NoteRevisionViewer
			navigation={navigationState}
		/>
	</TestProviderStack>;
};

const createNoteWithTestRevisions = async (count: number) => {
	const note = await Note.save({ title: 'Note', body: 'Test', parent_id: '' });
	const noteId = note.id;

	for (let i = 0; i < count; i++) {
		jest.advanceTimersByTime(1000 * 60 * 10);
		await Note.save({
			id: noteId,
			title: `Note - Updated (x${i + 1})`,
			body: `Update ${i + 1}`,
		});
		await revisionService().collectRevisions();
	}

	// Verify that the revisions were created successfully
	expect(await Revision.allByType(ModelType.Note, noteId)).toHaveLength(count);
	return note;
};

const getRevisionViewerDom = async () => {
	return await getWebViewDomById('NoteBodyViewer');
};

const getRevisionViewerText = async () => {
	// Use #rendered-md and not body. With jsdom, 'body' has
	// CSS in its .textContent.
	const mainContent = (await getRevisionViewerDom()).querySelector('#rendered-md');
	return mainContent.textContent.trim();
};

describe('screens/NoteRevisionViewer', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		store = createMockReduxStore();
		setupGlobalStore(store);

		jest.useFakeTimers({ advanceTimers: true });
	});
	afterEach(() => {
		screen.unmount();
	});

	test('should render "No revision selected" when no revisions are selected', async () => {
		const note = await createNoteWithTestRevisions(3);
		const { unmount } = render(<WrappedRevisionViewerScreen noteId={note.id}/>);

		expect(await getRevisionViewerText()).toBe('No revision selected');

		unmount();
	});

	test('selecting a revision should render its content', async () => {
		const note = await createNoteWithTestRevisions(3);
		render(<WrappedRevisionViewerScreen noteId={note.id}/>);

		const dropdown = screen.getByRole('button', { name: 'Select a revision...' });
		fireEvent.press(dropdown);

		// Select the second revision
		await waitFor(() => {
			const firstRevision = screen.getAllByRole('menuitem')[1];
			fireEvent.press(firstRevision);
		});

		await waitFor(async () => {
			expect(await getRevisionViewerText()).toBe('Update 2');
		});
	});
});
