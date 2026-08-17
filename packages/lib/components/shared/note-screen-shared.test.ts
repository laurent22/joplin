import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import shared, { BaseNoteScreenComponent } from './note-screen-shared';

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
		jest.spyOn(Note, 'load').mockResolvedValue(encryptedNote as never);
		jest.spyOn(Note, 'decrypt').mockResolvedValue(decryptedNote as never);
		const component = newComponent();

		await shared.reloadNote(component);

		expect(component.setState).toHaveBeenCalledWith(expect.objectContaining({ note: decryptedNote }));
	});

	it('should use the empty-note branch when the master key is not loaded', async () => {
		const encryptedNote = { id: 'note-id', encryption_cipher_text: 'cipher text' };
		const error = Object.assign(new Error('Master key is not loaded'), { code: 'masterKeyNotLoaded' });
		jest.spyOn(Note, 'load').mockResolvedValue(encryptedNote as never);
		jest.spyOn(Note, 'decrypt').mockRejectedValue(error);
		const component = newComponent();

		const result = await shared.reloadNote(component);

		expect(result).toBeNull();
		expect(component.setState).toHaveBeenCalledWith(expect.objectContaining({ note: {}, isLoading: true }));
	});
});
