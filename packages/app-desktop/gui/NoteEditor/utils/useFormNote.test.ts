import Note from '@joplin/lib/models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { renderHook } from '@testing-library/react-hooks';
import useFormNote, { DbNote, HookDependencies } from './useFormNote';

const defaultFormNoteProps: HookDependencies = {
	syncStarted: false,
	decryptionStarted: false,
	noteId: '',
	isProvisional: false,
	titleInputRef: null,
	editorRef: null,
	onBeforeLoad: ()=>{},
	onAfterLoad: ()=>{},
	dbNote: { id: '', updated_time: 0 },
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

	it('should reload the note when it is changed outside of the editor', async () => {
		const note = await Note.save({ title: 'Test Note!' });

		const makeFormNoteProps = (dbNote: DbNote): HookDependencies => {
			return {
				...defaultFormNoteProps,
				noteId: note.id,
				dbNote,
			};
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: makeFormNoteProps({ id: note.id, updated_time: note.updated_time }),
		});

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Test Note!');
		});

		// Simulate the note being modified outside the editor
		const modifiedNote = await Note.save({ id: note.id, title: 'Modified' });

		// NoteEditor then would update `dbNote`
		formNote.rerender(makeFormNoteProps({ id: note.id, updated_time: modifiedNote.updated_time }));

		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Modified');
		});
	});

});
