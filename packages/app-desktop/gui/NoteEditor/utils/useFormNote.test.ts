import Note from '@joplin/lib/models/Note';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, supportDir, switchClient, withWarningSilenced, noteLockCipherTextStandIn } from '@joplin/lib/testing/test-utils';
import { act, renderHook, waitFor } from '@testing-library/react';
import useFormNote, { HookDependencies } from './useFormNote';
import useScheduleSaveCallbacks from './useScheduleSaveCallbacks';
import { defaultFormNote } from './types';
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

const deferred = <T>() => {
	let resolve: (value: T)=> void;
	const promise = new Promise<T>(resolvePromise => {
		resolve = resolvePromise;
	});
	return { promise, resolve: resolve! };
};

describe('useFormNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		// Pinned off regardless of the build's default so the fixtures below save raw bodies.
		Setting.setValue('featureFlag.noteLock', false);
	});

	// The session and decryption internals are covered by the lib tests; here they are mocked to
	// test only the hook's gating: ciphertext must never reach the form note.
	it('should not produce a form note for a locked note while the session is locked, and decrypt it once unlocked', async () => {
		// Saved with the flag off so the raw body stands in for ciphertext; an ungated save with
		// the flag on would encrypt it.
		const testNote = await Note.save({ title: 'Locked note', body: 'ciphertext', is_locked: 1 });
		Setting.setValue('featureFlag.noteLock', true);

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
		const testNote = await Note.save({ title: 'Locked note', body: 'ciphertext', is_locked: 1 });
		Setting.setValue('featureFlag.noteLock', true);
		// The save's own change event would otherwise reach the hook's listener and reload the note.
		await ItemChange.waitForAllSaved();

		const isUnlockedMock = jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(true);
		const decryptBodyMock = jest.spyOn(NoteLockNote, 'decryptBody').mockRejectedValue(new Error('OperationError'));
		const onDecryptFailedChange = jest.fn();

		try {
			const render = renderHook(props => useFormNote(props), {
				initialProps: { ...defaultFormNoteProps, noteId: testNote.id, noteLockSessionUnlocked: true, onDecryptFailedChange },
			});
			await withWarningSilenced(/Could not decrypt locked note/, async () => {
				await waitFor(() => {
					expect(render.result.current.decryptFailed).toBe(true);
				});
			}, { requireWarning: true });
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


	it('should show a locked note again after sync re-encrypts it and the decryption worker restores it', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const testNote = await Note.save({ title: 'Locked', body: noteLockCipherTextStandIn(), is_locked: 1 });
		jest.spyOn(NoteLockSession.instance(), 'isUnlocked').mockReturnValue(true);
		jest.spyOn(NoteLockSession.instance(), 'decryptedKey').mockReturnValue({ id: 'key-id', plainText: 'key' });
		// Like the real decrypt, a row sync has not decrypted yet has no note lock body and fails.
		const decryptBodyMock = jest.spyOn(NoteLockNote, 'decryptBody').mockImplementation(async note => {
			if (note.encryption_applied) throw new Error('Invalid encryption identifier');
			return { ...note, isDecrypted: true, body: 'secret' };
		});
		const onReloadInProgressChange = jest.fn();
		const props = { ...defaultFormNoteProps, noteId: testNote.id, noteLockSessionUnlocked: true, editorNoteReloadTimeRequest: 0, onReloadInProgressChange };

		try {
			const formNote = renderHook(hookProps => useFormNote(hookProps), { initialProps: props });
			await waitFor(() => expect(formNote.result.current.formNote.body).toBe('secret'));

			// Sync overwrites the row with the encrypted item and asks the editor to reload.
			await act(async () => {
				await Note.save({ id: testNote.id, encryption_cipher_text: 'cipher_text', encryption_applied: 1, body: '', is_locked: 1 });
			});
			formNote.rerender({ ...props, editorNoteReloadTimeRequest: 1 });
			await waitFor(() => expect(formNote.result.current.formNote).toMatchObject({ encryption_applied: 1 }));

			// The decryption worker then writes the decrypted item back.
			await act(async () => {
				await Note.save({ id: testNote.id, title: 'Locked', body: noteLockCipherTextStandIn(), is_locked: 1, encryption_cipher_text: '', encryption_applied: 0 }, { autoTimestamp: false, changeSource: ItemChange.SOURCE_DECRYPTION });
			});
			await waitFor(() => expect(formNote.result.current.formNote).toMatchObject({ encryption_applied: 0, body: 'secret' }), { timeout: 15_000 });
			await waitFor(() => expect(onReloadInProgressChange).toHaveBeenLastCalledWith(false));
			formNote.unmount();
		} finally {
			decryptBodyMock.mockRestore();
			Setting.setValue('featureFlag.noteLock', false);
		}
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
		}, { timeout: 15_000 });

		// Should preserve is_conflict after save.
		expect(await formNoteToNote(formNote.result.current.formNote)).toMatchObject({
			is_conflict: 1,
			deleted_time: 0,
			title: testNote.title,
		});

		formNote.unmount();
	});

	it('should not overwrite an externally moved note when saving dirty editor content', async () => {
		const folderA = await Folder.save({ title: 'A' });
		const folderB = await Folder.save({ title: 'B' });
		const note = await Note.save({ title: 'Shopping list', body: 'Initial', parent_id: folderA.id });
		const form = renderHook(props => useFormNote(props), {
			initialProps: { ...defaultFormNoteProps, noteId: note.id },
		});
		await waitFor(() => expect(form.result.current.formNote.id).toBe(note.id));
		act(() => form.result.current.setFormNote(previous => ({
			...previous, body: 'Updated by editor', hasChanged: true,
		})));

		await act(async () => {
			await Note.save({ id: note.id, parent_id: folderB.id });
		});
		const dirtyForm = form.result.current.formNote;
		expect(dirtyForm.parent_id).toBe(folderA.id);
		const saving = renderHook(() => useScheduleSaveCallbacks({
			formNote: { current: dirtyForm },
			setFormNote: { current: form.result.current.setFormNote },
			editorId: 'editor',
			editorRef: { current: null },
			editorNoteReloadTimeRequest: 0,
			dispatch: jest.fn(),
		}));

		await act(async () => {
			await saving.result.current.scheduleSaveNote(dirtyForm);
		});
		expect(await Note.load(note.id)).toMatchObject({
			parent_id: folderB.id, body: 'Updated by editor',
		});
		expect(form.result.current.formNote.parent_id).toBe(folderB.id);
		saving.unmount();
		form.unmount();
	});

	it('should preserve a move that occurs during the queued editor save', async () => {
		const folderA = await Folder.save({ title: 'A' });
		const folderB = await Folder.save({ title: 'B' });
		const folderC = await Folder.save({ title: 'C' });
		const note = await Note.save({ title: 'Shopping list', body: 'Initial', parent_id: folderA.id });
		const form = renderHook(props => useFormNote(props), {
			initialProps: { ...defaultFormNoteProps, noteId: note.id },
		});
		await waitFor(() => expect(form.result.current.formNote.id).toBe(note.id));
		act(() => form.result.current.setFormNote(previous => ({
			...previous, body: 'Queued editor text', hasChanged: true,
		})));
		const dirtyForm = form.result.current.formNote;
		const saving = renderHook(() => useScheduleSaveCallbacks({
			formNote: { current: dirtyForm },
			setFormNote: { current: form.result.current.setFormNote },
			editorId: 'editor',
			editorRef: { current: null },
			editorNoteReloadTimeRequest: 0,
			dispatch: jest.fn(),
		}));

		await Note.save({ id: note.id, parent_id: folderB.id });
		const dispatchOriginal = Note.dispatch;
		const dispatchedActions: { type: string; changeId?: string; changedFields?: string[] }[] = [];
		Note.dispatch = (action: { type: string; changeId?: string; changedFields?: string[] }) => {
			dispatchedActions.push(action);
			dispatchOriginal(action);
		};
		const originalSave = Note.save.bind(Note);
		let movedDuringSave = false;
		const saveSpy = jest.spyOn(Note, 'save').mockImplementation(async (noteUpdate, options) => {
			if (!movedDuringSave && options?.changeId === 'editorChange-editor') {
				movedDuringSave = true;
				await originalSave({ id: note.id, parent_id: folderC.id });
			}
			return originalSave(noteUpdate, options);
		});
		try {
			await act(async () => {
				await saving.result.current.scheduleSaveNote(dirtyForm);
			});
		} finally {
			saveSpy.mockRestore();
			Note.dispatch = dispatchOriginal;
			saving.unmount();
		}
		expect(movedDuringSave).toBe(true);
		expect(await Note.load(note.id)).toMatchObject({
			parent_id: folderC.id, body: 'Queued editor text',
		});
		expect(form.result.current.formNote.parent_id).toBe(folderC.id);
		const editorUpdates = dispatchedActions.filter(action => (
			action.type === 'NOTE_UPDATE_ONE' && action.changeId === 'editorChange-editor'
		));
		expect(editorUpdates).toHaveLength(1);
		expect(editorUpdates[0].changedFields).not.toContain('parent_id');
		form.unmount();
	});

	it('should keep the initial notebook when saving a newly created note', async () => {
		const folder = await Folder.save({ title: 'New note notebook' });
		const form = {
			...defaultFormNote(), parent_id: folder.id, is_conflict: 0,
			title: 'New note title', body: 'New note content',
			saveActionQueue: new AsyncActionQueue(300),
		};
		const saving = renderHook(() => useScheduleSaveCallbacks({
			formNote: { current: form },
			setFormNote: { current: () => {} },
			editorId: 'editor',
			editorRef: { current: null },
			editorNoteReloadTimeRequest: 0,
			dispatch: jest.fn(),
		}));
		await act(async () => {
			await saving.result.current.scheduleSaveNote(form);
		});
		const created = (await Note.all()).find(note => note.title === form.title);
		expect(created).toMatchObject({
			parent_id: folder.id, body: form.body,
		});
		saving.unmount();
	});

	it('should reload the note when it is changed outside of the editor', async () => {
		const note = await Note.save({ title: 'Test Note!', body: '...' });
		const onReloadInProgressChange = jest.fn();

		const props = {
			...defaultFormNoteProps,
			noteId: note.id,
			onReloadInProgressChange,
		};

		const formNote = renderHook(props => useFormNote(props), {
			initialProps: props,
		});

		await waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Test Note!');
		});
		expect(formNote.result.current.formNote.share_id).toBe('');

		// Simulate the note being modified outside the editor, e.g. sync assigning it to a share
		await act(async () => {
			await Note.save({ id: note.id, title: 'Modified', share_id: 'share-1' });
		});

		await waitFor(() => {
			expect(formNote.result.current.formNote.title).toBe('Modified');
		});
		expect(formNote.result.current.formNote.share_id).toBe('share-1');
		expect(onReloadInProgressChange).not.toHaveBeenCalled();

		formNote.unmount();
	});

	it('should force a reload when editorNoteReloadTimeRequest changes', async () => {
		const note = await Note.save({ title: 'Original', body: '...' });
		const onReloadInProgressChange = jest.fn();
		const props = { ...defaultFormNoteProps, noteId: note.id, editorNoteReloadTimeRequest: 0, onReloadInProgressChange };
		const formNote = renderHook(hookProps => useFormNote(hookProps), { initialProps: props });
		await waitFor(() => expect(formNote.result.current.formNote.title).toBe('Original'));

		act(() => {
			formNote.result.current.setFormNote(previous => ({ ...previous, title: 'Unsaved local title', hasChanged: true }));
		});
		await Note.save({ id: note.id, title: 'Remote title' }, { changeId: 'test-editor' });
		formNote.rerender({ ...props, editorNoteReloadTimeRequest: 1 });

		await waitFor(() => expect(onReloadInProgressChange).toHaveBeenCalledWith(true));
		await waitFor(() => expect(formNote.result.current.formNote.title).toBe('Remote title'));
		await waitFor(() => expect(onReloadInProgressChange).toHaveBeenLastCalledWith(false));
		formNote.unmount();
	});

	it('should clear reloadInProgress after overlapping reload requests', async () => {
		const note = await Note.save({ title: 'Original', body: '...' });
		const onReloadInProgressChange = jest.fn();
		const props = { ...defaultFormNoteProps, noteId: note.id, editorNoteReloadTimeRequest: 0, onReloadInProgressChange };
		const formNote = renderHook(hookProps => useFormNote(hookProps), { initialProps: props });
		await waitFor(() => expect(formNote.result.current.formNote.title).toBe('Original'));

		const firstLoad = deferred<typeof note>();
		const lastLoad = deferred<typeof note>();
		const loadMock = jest.spyOn(Note, 'load')
			.mockImplementationOnce(() => firstLoad.promise)
			.mockImplementationOnce(() => lastLoad.promise);

		formNote.rerender({ ...props, editorNoteReloadTimeRequest: 1 });
		await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(1));
		formNote.rerender({ ...props, editorNoteReloadTimeRequest: 2 });

		firstLoad.resolve({ ...note, title: 'First reload' });
		await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(2));
		expect(onReloadInProgressChange).toHaveBeenLastCalledWith(true);

		lastLoad.resolve({ ...note, title: 'Last reload' });
		await waitFor(() => expect(formNote.result.current.formNote.title).toBe('Last reload'));
		await waitFor(() => expect(onReloadInProgressChange).toHaveBeenLastCalledWith(false));

		loadMock.mockRestore();
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
