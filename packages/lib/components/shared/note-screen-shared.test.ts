import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import shared, { BaseNoteScreenComponent } from './note-screen-shared';

const deferred = <T>() => {
	let resolve: (value: T)=> void;
	const promise = new Promise<T>(resolvePromise => {
		resolve = resolvePromise;
	});
	return { promise, resolve: resolve! };
};

const newComponent = () => ({
	props: {
		provisionalNoteIds: [],
		noteId: 'note-id',
		folders: [],
		sharedData: undefined,
		noteVisiblePanes: ['editor'],
	},
	state: { mode: 'edit' },
	setState: jest.fn(),
	scheduleFocusUpdate: jest.fn(),
}) as unknown as BaseNoteScreenComponent;

describe('note-screen-shared', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		jest.spyOn(shared, 'attachedResources').mockResolvedValue({});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should reload an encrypted note after decrypting it', async () => {
		const encryptedNote = { id: 'note-id', encryption_cipher_text: 'cipher text', deleted_time: 0 };
		const decryptedNote = { ...encryptedNote, encryption_cipher_text: '', title: 'Title', body: 'Body' };
		const decryptStarted = deferred<void>();
		const decryption = deferred<typeof decryptedNote>();
		jest.spyOn(Note, 'load').mockResolvedValue(encryptedNote as never);
		jest.spyOn(Note, 'decrypt').mockImplementation(() => {
			decryptStarted.resolve();
			return decryption.promise as never;
		});
		const component = newComponent();

		const reloadPromise = shared.reloadNote(component);
		await decryptStarted.promise;
		expect(component.setState).not.toHaveBeenCalled();

		decryption.resolve(decryptedNote);
		await reloadPromise;

		expect(component.setState).toHaveBeenCalledWith(expect.objectContaining({ note: decryptedNote }));
	});

	it.each([
		['the master key is not loaded', Object.assign(new Error('Master key is not loaded'), { code: 'masterKeyNotLoaded' })],
		['decryption otherwise fails', new Error('Invalid ciphertext')],
	])('should use the empty-note branch when %s', async (_description, error) => {
		const encryptedNote = { id: 'note-id', encryption_cipher_text: 'cipher text' };
		jest.spyOn(Note, 'load').mockResolvedValue(encryptedNote as never);
		jest.spyOn(Note, 'decrypt').mockRejectedValue(error);
		const component = newComponent();

		const result = await shared.reloadNote(component);

		expect(result).toBeNull();
		expect(component.setState).toHaveBeenCalledWith(expect.objectContaining({ note: {}, isLoading: true }));
	});
});
