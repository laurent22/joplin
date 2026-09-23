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
import { NoteEntity } from '@joplin/lib/services/database/types';
import { useMemo } from 'react';
import Revision from '@joplin/lib/models/Revision';
import { ModelType } from '@joplin/lib/BaseModel';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';
import Setting from '@joplin/lib/models/Setting';
import NoteLockKey from '@joplin/lib/services/noteLock/NoteLockKey';
import NoteLockService from '@joplin/lib/services/noteLock/NoteLockService';
import Folder from '@joplin/lib/models/Folder';
import shim from '@joplin/lib/shim';

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

const createLockedRevision = (note: NoteEntity, title: string, body: string, age = 0) => Revision.save({
	item_type: ModelType.Note,
	item_id: note.id,
	item_updated_time: note.updated_time - age,
	parent_id: '',
	is_locked: 1,
	title_diff: Revision.createTextPatch('', title),
	body_diff: Revision.createTextPatch('', body),
	metadata_diff: Revision.createObjectPatch({}, { is_locked: 1 }),
});

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
		jest.restoreAllMocks();
	});

	test('should render "No revision selected" when no revisions are selected', async () => {
		const note = await createNoteWithTestRevisions(3);
		const { unmount } = render(<WrappedRevisionViewerScreen noteId={note.id}/>);

		expect(await getRevisionViewerText()).toBe('No revision selected');

		unmount();
	});

	test('should gate an encrypted revision behind the unlock panel until the session is unlocked', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const note = await Note.save({ title: 'Note', body: 'enc(secret)', is_locked: 1, parent_id: '' });
		await createLockedRevision(note, 'Note', 'enc(secret)');
		jest.spyOn(NoteLockKey.instance(), 'load').mockReturnValue({ id: 'key-id' });
		jest.spyOn(NoteLockService, 'instance').mockReturnValue({
			decryptString: async (cipherText: string) => {
				if (cipherText !== 'enc(secret)') throw new Error('Unexpected cipher text');
				return 'secret';
			},
		} as ReturnType<typeof NoteLockService.instance>);

		render(<WrappedRevisionViewerScreen noteId={note.id}/>);

		const dropdown = screen.getByRole('button', { name: 'Select a revision...' });
		fireEvent.press(dropdown);
		await waitFor(() => {
			fireEvent.press(screen.getAllByRole('menuitem')[0]);
		});

		await waitFor(() => {
			expect(screen.getByText('This note is locked. Enter your password to unlock your notes for this session.')).toBeVisible();
		});

		store.dispatch({ type: 'SET_NOTE_LOCK_SESSION_UNLOCKED', value: true });

		await waitFor(async () => {
			expect(await getRevisionViewerText()).toBe('secret');
		});
	});

	test('should keep Restore disabled until the selected revision has been checked', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const note = await Note.save({ title: 'Note', body: 'enc(new)', is_locked: 1, parent_id: '' });
		await createLockedRevision(note, 'Old', 'enc(old)', 60000);
		await createLockedRevision(note, 'New', 'enc(new)');
		jest.spyOn(NoteLockKey.instance(), 'load').mockReturnValue({ id: 'key-id' });
		jest.spyOn(console, 'warn').mockImplementation(() => {});
		// Each decrypt stays pending until the test settles it, so the state during a switch can be checked.
		const pending: Record<string, { resolve: (value: string)=> void; reject: (error: Error)=> void }> = {};
		jest.spyOn(NoteLockService, 'instance').mockReturnValue({
			decryptString: (cipherText: string) => new Promise<string>((resolve, reject) => { pending[cipherText] = { resolve, reject }; }),
		} as ReturnType<typeof NoteLockService.instance>);
		store.dispatch({ type: 'SET_NOTE_LOCK_SESSION_UNLOCKED', value: true });
		render(<WrappedRevisionViewerScreen noteId={note.id}/>);

		// The dropdown's accessible name becomes the selected label, so it is found by its hint
		const selectRevision = async (index: number, cipherText: string) => {
			delete pending[cipherText];
			fireEvent.press(screen.getByHintText('Revision: Opens dropdown'));
			await waitFor(() => {
				fireEvent.press(screen.getAllByRole('menuitem')[index]);
			});
			await waitFor(() => {
				expect(pending[cipherText]).toBeTruthy();
			});
		};
		const restoreDisabled = () => !!screen.getByRole('button', { name: 'Restore' }).props.accessibilityState?.disabled;
		const undecryptableMessage = 'This note could not be unlocked. If it was locked prior to a password reset, the content is no longer recoverable.';

		await selectRevision(0, 'enc(new)');
		expect(restoreDisabled()).toBe(true);
		pending['enc(new)'].resolve('new');
		await waitFor(async () => {
			expect(await getRevisionViewerText()).toBe('new');
		});
		expect(restoreDisabled()).toBe(false);

		await selectRevision(1, 'enc(old)');
		expect(restoreDisabled()).toBe(true);
		pending['enc(old)'].reject(new Error('wrong key'));
		await waitFor(() => {
			expect(screen.getByText(undecryptableMessage)).toBeVisible();
		});
		expect(restoreDisabled()).toBe(true);

		await selectRevision(0, 'enc(new)');
		expect(screen.queryByText(undecryptableMessage)).toBeNull();
		expect(restoreDisabled()).toBe(true);
		pending['enc(new)'].resolve('new');
		await waitFor(async () => {
			expect(await getRevisionViewerText()).toBe('new');
		});
		expect(restoreDisabled()).toBe(false);

		// Restore writes the encrypted revision, not the decrypted copy shown in the viewer. Real timers
		// from here, since waitFor advances the fake clock instead of giving the sqlite restore time.
		const messageBoxSpy = jest.spyOn(shim, 'showMessageBox').mockResolvedValue(0);
		jest.useRealTimers();
		fireEvent.press(screen.getByRole('button', { name: 'Restore' }));
		await waitFor(() => {
			expect(messageBoxSpy).toHaveBeenCalled();
		}, { timeout: 10000 });
		const restored = (await Note.all()).find(n => n.id !== note.id);
		expect(restored).toMatchObject({ title: 'New', body: 'enc(new)', is_locked: 1 });
		expect((await Folder.load(restored.parent_id)).title).toBe('Restored Notes');
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
