import Note from '@joplin/lib/models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { act, renderHook } from '@testing-library/react-hooks';
import useFormNote, { HookDependencies } from './useFormNote';

const defaultFormNoteProps: HookDependencies = {
	syncStarted: false,
	decryptionStarted: false,
	noteId: '',
	isProvisional: false,
	titleInputRef: null,
	editorRef: null,
	onBeforeLoad: ()=>{},
	onAfterLoad: ()=>{},
};

describe('useFormNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should update note when decryption completes', async () => {
		const testNote = await Note.save({ title: 'Test Note!' });

		const makeFormNoteProps = (syncStarted: boolean, decryptionStarted: boolean): HookDependencies => {
			return {
				...defaultFormNoteProps,
				syncStarted,
				decryptionStarted,
				noteId: testNote.id,
			};
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: makeFormNoteProps(true, false),
		});
		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				encryption_applied: 0,
				title: testNote.title,
			});
		});

		await act(async () => {
			await Note.save({
				id: testNote.id,
				encryption_cipher_text: 'cipher_text',
				encryption_applied: 1,
			});
		});

		// Sync starting should cause a re-render
		formNote.rerender(makeFormNoteProps(false, false));

		await act(async () => {
			await formNote.waitFor(() => {
				expect(formNote.result.current.formNote).toMatchObject({
					encryption_applied: 1,
				});
			});
		});


		formNote.rerender(makeFormNoteProps(false, true));

		await act(async () => {
			await Note.save({
				id: testNote.id,
				encryption_applied: 0,
				title: 'Test Note!',
			});
		});

		// Ending decryption should also cause a re-render
		formNote.rerender(makeFormNoteProps(false, false));

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				encryption_applied: 0,
				title: 'Test Note!',
			});
		});

		formNote.unmount();
	});

	it('should reload the note when it is changed outside of the editor', async () => {
		const note = await Note.save({ title: 'Test Note!', body: '...' });

		const props = {
			...defaultFormNoteProps,
			noteId: note.id,
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: props,
		});

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Test Note!');
		});

		// Simulate the note being modified outside the editor
		await act(async () => {
			await Note.save({ id: note.id, title: 'Modified' });
		});

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Modified');
		});

		formNote.unmount();
	});

});
