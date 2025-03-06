import Note from '@joplin/lib/models/Note';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '@joplin/lib/testing/test-utils';
import { act, renderHook } from '@testing-library/react-hooks';
import useFormNote, { HookDependencies } from './useFormNote';
import shim from '@joplin/lib/shim';
import Resource from '@joplin/lib/models/Resource';
import { join } from 'path';
import { formNoteToNote } from '.';

const defaultFormNoteProps: HookDependencies = {
	noteId: '',
	isProvisional: false,
	titleInputRef: null,
	editorRef: null,
	onBeforeLoad: () => { },
	onAfterLoad: () => { },
	editorId: 'editor',
	builtInEditorVisible: false,
};

describe('useFormNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should update note when decryption completes', async () => {
		const testNote = await Note.save({ title: 'Test Note!' });

		const makeFormNoteProps = (): HookDependencies => {
			return {
				...defaultFormNoteProps,
				noteId: testNote.id,
			};
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: makeFormNoteProps(),
		});
		await formNote.waitFor(() => {
			// id is falsy until after the first load of the form note.
			expect(formNote.result.current.formNote.id).not.toBeFalsy();
		});
		expect(formNote.result.current.formNote).toMatchObject({
			encryption_applied: 0,
			title: testNote.title,
		});

		await act(async () => {
			await Note.save({
				id: testNote.id,
				encryption_cipher_text: 'cipher_text',
				encryption_applied: 1,
			});
		});

		// Changing encryption_applied should cause a re-render
		await act(async () => {
			await formNote.waitFor(() => {
				expect(formNote.result.current.formNote).toMatchObject({
					encryption_applied: 1,
				});
			});
		});

		await act(async () => {
			await Note.save({
				id: testNote.id,
				encryption_applied: 0,
				title: 'Test Note!',
			});
		});

		// Ending decryption should also cause a re-render
		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				encryption_applied: 0,
			});
			// A larger-than-default timeout is needed to prevent CI failures:
		}, { timeout: 15_000 });

		formNote.unmount();
	});


	// Lacking is_conflict has previously caused UI issues. See https://github.com/laurent22/joplin/pull/10913
	// for details.
	it('should preserve value of is_conflict on save', async () => {
		const testNote = await Note.save({ title: 'Test Note!', is_conflict: 1 });

		const makeFormNoteProps = (): HookDependencies => {
			return {
				...defaultFormNoteProps,
				noteId: testNote.id,
			};
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: makeFormNoteProps(),
		});
		await formNote.waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				is_conflict: 1,
				title: testNote.title,
			});
		});

		// Should preserve is_conflict after save.
		expect(await formNoteToNote(formNote.result.current.formNote)).toMatchObject({
			is_conflict: 1,
			deleted_time: 0,
			title: testNote.title,
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

	test('should refresh resource infos when changed outside the editor', async () => {
		let note = await Note.save({});
		note = await shim.attachFileToNote(note, join(supportDir, 'sample.txt'));
		const resourceIds = Note.linkedItemIds(note.body);
		const resource = await Resource.load(resourceIds[0]);

		const makeFormNoteProps = (): HookDependencies => {
			return {
				...defaultFormNoteProps,
				noteId: note.id,
			};
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: makeFormNoteProps(),
		});

		await formNote.waitFor(() => {
			return Object.values(formNote.result.current.resourceInfos).length > 0;
		});
		const initialResourceInfos = formNote.result.current.resourceInfos;
		expect(initialResourceInfos).toMatchObject({
			[resource.id]: { item: { id: resource.id } },
		});

		await act(async () => {
			await Resource.save({ ...resource, filename: 'test.txt' });
		});
		await formNote.waitFor(() => {
			const resourceInfo = formNote.result.current.resourceInfos[resource.id];
			expect(resourceInfo.item).toMatchObject({
				id: resource.id, filename: 'test.txt',
			});
		});

		formNote.unmount();
	});
});
