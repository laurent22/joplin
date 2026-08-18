import * as React from 'react';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import { msleep, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import TestProviderStack from '../testing/TestProviderStack';
import ShareNoteDialog from './ShareNoteDialog';
import Note from '@joplin/lib/models/Note';
import mockShareService from '@joplin/lib/testing/share/mockShareService';
import { act, fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import Folder from '@joplin/lib/models/Folder';
import ShareService from '@joplin/lib/services/share/ShareService';
import { ShareType, StateShare } from '@joplin/lib/services/share/reducer';

const mockServiceForNoteSharing = (shares: StateShare[]) => {
	mockShareService({
		getShares: async () => {
			return { items: shares };
		},
		postShares: async () => ({ id: 'test-id' }),
		getShareInvitations: async () => null,
	}, ShareService.instance());
};

interface WrapperProps {
	noteId: string;
	onClose?: ()=> void;
}

let store: Store<AppState>;
const WrappedShareDialog: React.FC<WrapperProps> = ({
	noteId, onClose = () => {},
}) => {
	return <TestProviderStack store={store}>
		<ShareNoteDialog
			noteId={noteId}
			visible={true}
			onClose={onClose}
		/>
	</TestProviderStack>;
};

describe('ShareNoteDialog', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		store = createMockReduxStore();
		setupGlobalStore(store);

		mockServiceForNoteSharing([]);
	});

	test('pressing "Copy Shareable Link" should publish the note', async () => {
		const folder = await Folder.save({ title: 'Folder' });
		const note = await Note.save({ title: 'Test', parent_id: folder.id });

		const { unmount } = render(<WrappedShareDialog noteId={note.id}/>);

		const linkButton = await screen.findByRole('button', { name: 'Copy Shareable Link' });
		expect(linkButton).not.toBeDisabled();
		fireEvent.press(linkButton);

		await waitFor(() => {
			expect(screen.getByText('Link has been copied to clipboard!')).toBeVisible();
			// Synchronization can take a long time
		}, { timeout: 20 * 1000 });
		expect(await Note.load(note.id)).toMatchObject({
			is_shared: 1,
		});

		unmount();
	});

	test.each([
		{
			label: 'should not show "Unpublish" for unpublished notes',
			published: false,
		},
		{
			label: 'should show an "Unpublish" button for published notes',
			published: true,
		},
	])('$label', async ({ published }) => {
		const folder = await Folder.save({ title: 'Folder' });
		const note = await Note.save({ title: 'Test', parent_id: folder.id });

		if (published) {
			await ShareService.instance().shareNote(note.id, false);
			await synchronizerStart();

			mockServiceForNoteSharing([
				{ id: '1234', note_id: note.id, folder_id: '', master_key_id: '', type: ShareType.Note },
			]);
		}

		const { unmount } = render(<WrappedShareDialog noteId={note.id}/>);
		// Yield to the event loop -- allow useEffect hooks and async calls to run.
		await act(() => msleep(1));

		if (published) {
			expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeVisible();
		} else {
			const unpublishButton = screen.queryByRole('button', { name: 'Unpublish' });
			expect(unpublishButton).toBeNull();
		}

		unmount();
	});
});
