import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '@joplin/lib/testing/test-utils';
import { act, renderHook, waitFor } from '@testing-library/react';
import useFormNote, { HookDependencies } from './useFormNote';
import shim from '@joplin/lib/shim';
import Resource from '@joplin/lib/models/Resource';
import ItemChange from '@joplin/lib/models/ItemChange';
import { join } from 'path';
import { formNoteToNote } from '.';
import NoteLockNote from '@joplin/lib/services/noteLock/NoteLockNote';
import NoteLockSession from '@joplin/lib/services/noteLock/NoteLockSession';

const defaultFormNoteProps: HookDependencies = {
	noteId: '',
	isProvisional: false,
	titleInputRef: null,
	editorRef: null,
	onBeforeLoad: () => { },
	onAfterLoad: () => { },
	editorId: 'editor',
	builtInEditorVisible: false,
	noteLockSessionUnlocked: false,
	onDecryptFailedChange: () => {},
};

describe('useFormNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	// The session and decryption internals are covered by the lib tests; here they are mocked to
	// test only the hook's gating: ciphertext must never reach the form note.
	it('should not produce a form note for a locked note while the session is locked, and decrypt it once unlocked', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		// A direct save of a new note with is_locked keeps the raw body, standing in for ciphertext.
		const testNote = await Note.save({ title: 'Locked note', body: 'ciphertext', is_locked: 1 });

		const isUnlockedMock = jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(false);
		const decryptedKeyMock = jest.spyOn(NoteLockSession.instance(), 'decryptedKey').mockReturnValue({ id: 'key-id', plainText: 'key' });
		const decryptBodyMock = jest.spyOn(NoteLockNote, 'decryptBody').mockImplementation(async note => ({ ...note, body: 'secret content' }));
		const onBeforeLoad = jest.fn();
		const onDecryptFailedChange = jest.fn();

		try {
			const lockedRender = renderHook(props => useFormNote(props), {
				initialProps: { ...defaultFormNoteProps, noteId: testNote.id, onBeforeLoad, onDecryptFailedChange },
			});
			// The blocked load produces no state change to wait for; onBeforeLoad is its last
			// await, so once it has run a single flush completes the branch.
			await waitFor(() => expect(onBeforeLoad).toHaveBeenCalled());
			await act(async () => {});
			expect(lockedRender.result.current.formNote).toMatchObject({
				id: '',
				body: '',
				noteLockKey: null,
			});
			expect(lockedRender.result.current.loadBlocked).toBe(true);
			expect(onDecryptFailedChange).toHaveBeenLastCalledWith(false);

			isUnlockedMock.mockReturnValue(true);
			lockedRender.rerender({ ...defaultFormNoteProps, noteId: testNote.id, onBeforeLoad, onDecryptFailedChange, noteLockSessionUnlocked: true });
			await waitFor(() => {
				expect(lockedRender.result.current.formNote).toMatchObject({
					id: testNote.id,
					is_locked: 1,
					body: 'secret content',
					noteLockKey: { id: 'key-id', plainText: 'key' },
				});
			});
			expect(lockedRender.result.current.loadBlocked).toBe(false);
			lockedRender.unmount();

			Setting.setValue('featureFlag.noteLock', false);
			isUnlockedMock.mockReturnValue(false);
			const flagOffRender = renderHook(props => useFormNote(props), {
				initialProps: { ...defaultFormNoteProps, noteId: testNote.id },
			});
			await waitFor(() => {
				expect(flagOffRender.result.current.formNote.id).toBe(testNote.id);
			});
			expect(flagOffRender.result.current.formNote).toMatchObject({
				body: 'ciphertext',
			});
			flagOffRender.unmount();
		} finally {
			isUnlockedMock.mockRestore();
			decryptedKeyMock.mockRestore();
			decryptBodyMock.mockRestore();
			Setting.setValue('featureFlag.noteLock', false);
		}
	});

	it('should report a decryption failure instead of throwing, without producing a form note', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const testNote = await Note.save({ title: 'Locked note', body: 'ciphertext', is_locked: 1 });
		// The save's own change event would otherwise reach the hook's listener and reload the note.
		await ItemChange.waitForAllSaved();

		const isUnlockedMock = jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(true);
		const decryptBodyMock = jest.spyOn(NoteLockNote, 'decryptBody').mockRejectedValue(new Error('OperationError'));
		const onDecryptFailedChange = jest.fn();

		try {
			const render = renderHook(props => useFormNote(props), {
				initialProps: { ...defaultFormNoteProps, noteId: testNote.id, noteLockSessionUnlocked: true, onDecryptFailedChange },
			});
			await waitFor(() => {
				expect(render.result.current.decryptFailed).toBe(true);
			});
			expect(render.result.current.formNote).toMatchObject({
				id: '',
				body: '',
			});
			expect(render.result.current.loadBlocked).toBe(false);
			expect(onDecryptFailedChange).toHaveBeenLastCalledWith(true);
			render.unmount();
		} finally {
			isUnlockedMock.mockRestore();
			decryptBodyMock.mockRestore();
			Setting.setValue('featureFlag.noteLock', false);
		}
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
		await waitFor(() => {
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
		await waitFor(() => {
			expect(formNote.result.current.formNote).toMatchObject({
				encryption_applied: 1,
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
		await waitFor(() => {
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
		await waitFor(() => {
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

		await waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Test Note!');
		});

		// Simulate the note being modified outside the editor
		await act(async () => {
			await Note.save({ id: note.id, title: 'Modified' });
		});

		await waitFor(() => {
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

		await waitFor(() => {
			expect(Object.values(formNote.result.current.resourceInfos).length).toBeGreaterThan(0);
		});
		const initialResourceInfos = formNote.result.current.resourceInfos;
		expect(initialResourceInfos).toMatchObject({
			[resource.id]: { item: { id: resource.id } },
		});

		await act(async () => {
			await Resource.save({ ...resource, filename: 'test.txt' });
		});
		await waitFor(() => {
			const resourceInfo = formNote.result.current.resourceInfos[resource.id];
			expect(resourceInfo.item).toMatchObject({
				id: resource.id, filename: 'test.txt',
			});
		});

		formNote.unmount();
	});
});
