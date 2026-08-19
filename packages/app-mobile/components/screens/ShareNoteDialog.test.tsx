import * as React from 'react';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import TestProviderStack from '../testing/TestProviderStack';
import ShareNoteDialog from './ShareNoteDialog';
import Note from '@joplin/lib/models/Note';
import mockShareService from '@joplin/lib/testing/share/mockShareService';
import { fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import Folder from '@joplin/lib/models/Folder';
import ShareService from '@joplin/lib/services/share/ShareService';

const mockServiceForNoteSharing = () => {
	mockShareService({
		getShares: async () => {
			return { items: [] };
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

		mockServiceForNoteSharing();
	});

	test('pressing "Copy Shareable Link" should publish the note', async () => {
		const folder = await Folder.save({ title: 'Folder' });
		const note = await Note.save({ title: 'Test', parent_id: folder.id });

		render(<WrappedShareDialog noteId={note.id}/>);

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
	});
});
