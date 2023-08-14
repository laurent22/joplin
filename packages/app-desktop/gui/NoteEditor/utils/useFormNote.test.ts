import Note from '@joplin/lib/models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { renderHook } from '@testing-library/react-hooks';
import useFormNote, { HookDependencies } from './useFormNote';


describe('useFormNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should update note when decryption completes', async () => {
		const testNote = await Note.save({ title: 'Test Note!' });

		const makeFormNoteProps = (syncStarted: boolean, decryptionStarted: boolean): HookDependencies => {
			return {
				syncStarted,
				decryptionStarted,
				noteId: testNote.id,
				isProvisional: false,
				titleInputRef: null,
				editorRef: null,
				onBeforeLoad: ()=>{},
				onAfterLoad: ()=>{},
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

		await Note.save({
			id: testNote.id,
			encryption_cipher_text: 'cipher_text',
			encryption_applied: 1,
		});

		// Sync starting should cause a re-render
		formNote.rerender(makeFormNoteProps(false, false));

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				encryption_applied: 1,
			});
		});


		formNote.rerender(makeFormNoteProps(false, true));

		await Note.save({
			id: testNote.id,
			encryption_applied: 0,
			title: 'Test Note!',
		});

		// Ending decryption should also cause a re-render
		formNote.rerender(makeFormNoteProps(false, false));

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				encryption_applied: 0,
				title: 'Test Note!',
			});
		});
	});
});
