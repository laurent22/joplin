import Note from '../../models/Note';
import Folder from '../../models/Folder';
import BaseItem from '../../models/BaseItem';
import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import { ModelType } from '../../BaseModel';
import Synchronizer from '../../Synchronizer';
import shim from '../../shim';
import ReportService from '../ReportService';
import checkDisabledSyncItemsNotification from './utils/checkDisabledSyncItemsNotification';
import { AnyAction } from 'redux';
import { decryptionWorker, encryptionService, fileApi, loadEncryptionMasterKey, msleep, resourceService, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizer, synchronizerStart, syncTargetId } from '../../testing/test-utils';
import { remoteNotesFoldersResources } from '../../testing/test-utils-synchronizer';
import mockShareService from '../../testing/share/mockShareService';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from '../e2ee/utils';
import { ShareType, StateShare } from '../share/reducer';
import { reg } from '../../registry';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { newlyPublishedConfirmations } from './utils/plaintextUploadHeldBackItems';
import { BaseItemEntity, ResourceOcrStatus } from '../database/types';
import OcrService from '../ocr/OcrService';
import OcrDriverBase from '../ocr/OcrDriverBase';
import { RecognizeResult } from '../ocr/utils/types';
import restoreItems from '../trash/restoreItems';

const setupShareService = (shares: Partial<StateShare>[] = []) => {
	const service = mockShareService({
		onExec: async (method, path, _query, body) => {
			if (method === 'GET' && path === 'api/shares') return { items: shares };
			if (method === 'POST' && path === 'api/shares') {
				const share = { id: `share_${shares.length + 1}`, type: body.type ?? ShareType.Note, folder_id: body.folder_id, note_id: body.note_id };
				shares.push(share);
				return share;
			}
			throw new Error(`Unhandled: ${method} ${path}`);
		},
	});
	BaseItem.shareService_ = service;
	Resource.shareService_ = service;
	synchronizer().setShareService(service);
	return service;
};

const setupUnencryptedShare = async () => {
	const folder = await Folder.save({ title: 'shared' });
	const service = setupShareService([{ id: 'share1', type: ShareType.Folder, folder_id: folder.id, master_key_id: '' }]);
	await service.refreshShares();
	await Folder.save({ id: folder.id, share_id: 'share1' });
	return folder.id;
};

type HeldBackItemKind = 'publishedNote' | 'noteInUnencryptedShare' | 'notebookInUnencryptedShare';

// Creates an item that's held back from upload until the user confirms it
const createHeldBackItem = async (kind: HeldBackItemKind) => {
	if (kind === 'publishedNote') {
		const service = setupShareService();
		const note = await Note.save({ title: 'note' });
		await service.shareNote(note.id, false);
		return { id: note.id, itemType: ModelType.Note };
	}

	const folderId = await setupUnencryptedShare();
	if (kind === 'noteInUnencryptedShare') {
		const note = await Note.save({ title: 'note', parent_id: folderId, share_id: 'share1' });
		return { id: note.id, itemType: ModelType.Note };
	}
	const folder = await Folder.save({ title: 'notebook', parent_id: folderId, share_id: 'share1' });
	return { id: folder.id, itemType: ModelType.Folder };
};

const remoteContainsText = async (text: string) => {
	const list = await fileApi().list('', { includeDirs: false, syncItemsOnly: true });
	for (const file of list.items) {
		if ((await fileApi().get(file.path) as string).includes(text)) return true;
	}
	return false;
};

const remoteEncryptionApplied = async (id: string) => {
	return (await remoteNotesFoldersResources()).find(it => it.id === id).encryption_applied;
};

const remotePlaintextResourceBlobCount = async () => {
	const resources = (await remoteNotesFoldersResources()).filter(it => it.type_ === ModelType.Resource);
	let count = 0;
	for (const resource of resources) {
		const blob: string = await fileApi().get(`.resource/${resource.id}`, { encoding: 'ascii' });
		if (!blob.startsWith('JED')) count++;
	}
	return count;
};

const enableEncryption = async () => {
	const masterKey = await loadEncryptionMasterKey();
	await setupAndEnableEncryption(encryptionService(), masterKey, '111111');
	await loadMasterKeysFromSettings(encryptionService());
	return masterKey;
};

const heldBackItemIds = async () => {
	return (await BaseItem.plaintextUploadHeldBackSyncItems(syncTargetId())).map(syncItem => syncItem.item_id).sort();
};

// Stands in for the user confirming held-back items for upload
const confirmCurrentVersions = async (ids: string[] = null) => {
	const items: BaseItemEntity[] = await BaseItem.loadItemsByIds(ids ?? await heldBackItemIds());
	synchronizer().confirmPlaintextUploads(items.map(item => ({ id: item.id, updatedTime: item.updated_time })));
};

const confirmUpload = async (ids: string[] = null) => {
	await confirmCurrentVersions(ids);
	await synchronizerStart(null, { syncSteps: Synchronizer.partialSyncSteps });
};

const syncConfirmingAll = async () => {
	// Sync twice: Note.updatePublishedNotes sets is_shared is set at the end of a sync.
	// Notes in a newly published notebook are held back in the second sync and not the first.
	for (let i = 0; i < 2; i++) {
		await synchronizerStart();
		await confirmUpload();
	}
};

describe('Synchronizer.plaintextUploads', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await enableEncryption();
		reg.scheduleSync = jest.fn();
		reg.waitForSyncFinishedThenSync = jest.fn();
	});

	afterEach(() => {
		Setting.setValue('encryption.allowUnencryptedUploads', false);
		BaseItem.shareService_ = null;
		Resource.shareService_ = null;
		synchronizer().setShareService(null);
	});

	it('should hold back new and changed notes in a published notebook until the user confirms them, for one upload only', async () => {
		const service = setupShareService();
		const folder = await Folder.save({ title: 'published' });
		await service.publishFolder(folder.id);
		await syncConfirmingAll();
		expect(await remoteEncryptionApplied(folder.id)).toBe(0);

		const note = await Note.save({ title: 'new note', body: 'new body', parent_id: folder.id });
		await synchronizerStart();
		await synchronizerStart();
		expect(await remoteContainsText('new body')).toBe(false);
		expect(await heldBackItemIds()).toEqual([note.id]);

		await confirmUpload();
		expect(await remoteEncryptionApplied(note.id)).toBe(0);
		expect(await heldBackItemIds()).toEqual([]);

		await Note.save({ id: note.id, body: 'changed body' });
		await synchronizerStart();
		expect(await remoteContainsText('changed body')).toBe(false);
		expect(await heldBackItemIds()).toEqual([note.id]);
	});

	it('should only upload the confirmed items, without stopping the sync, and upload an item encrypted once it is unpublished', async () => {
		// is_shared stands in for publish propagation
		const confirmed = await Note.save({ title: 'confirmed', body: 'confirmed body', is_shared: 1 });
		const other = await Note.save({ title: 'other', body: 'other body', is_shared: 1 });
		const privateNote = await Note.save({ title: 'private' });
		await synchronizerStart();
		expect(await remoteEncryptionApplied(privateNote.id)).toBe(1);
		expect(await heldBackItemIds()).toEqual([confirmed.id, other.id].sort());

		await confirmUpload([confirmed.id]);
		expect(await remoteContainsText('confirmed body')).toBe(true);
		expect(await remoteContainsText('other body')).toBe(false);

		await Note.save({ id: other.id, is_shared: 0 });
		await synchronizerStart();
		expect(await remoteEncryptionApplied(other.id)).toBe(1);
		expect(await heldBackItemIds()).toEqual([]);
	});

	it('should hold back the blob of a published attachment, and upload it once the attachment is confirmed', async () => {
		const service = setupShareService();
		const note = await shim.attachFileToNote(await Note.save({ title: 'note' }), `${supportDir}/photo.jpg`);
		const resourceId = (await Note.linkedResourceIds(note.body))[0];
		await service.shareNote(note.id, false);
		await synchronizerStart();
		await synchronizerStart();
		expect(await remotePlaintextResourceBlobCount()).toBe(0);
		expect(await heldBackItemIds()).toContain(resourceId);

		await confirmUpload();
		expect(await remotePlaintextResourceBlobCount()).toBe(1);
	});

	it('should hold items back again on a new sync target, and keep them held back on the old one', async () => {
		const publishedNote = await Note.save({ title: 'published', body: 'published body', is_shared: 1 });
		const privateNote = await Note.save({ title: 'private', body: 'private body' });
		await synchronizerStart();
		expect(await heldBackItemIds()).toEqual([publishedNote.id]);

		const oldSyncTargetId = syncTargetId();
		const newSyncTargetId = SyncTargetRegistry.nameToId('dropbox');
		const heldBackIdsOn = async (id: number) => (await BaseItem.plaintextUploadHeldBackSyncItems(id)).map(syncItem => syncItem.item_id);

		try {
			await fileApi().clearRoot();
			fileApi().setSyncTargetId(newSyncTargetId);
			Setting.setValue('sync.target', newSyncTargetId);
			await synchronizerStart();

			expect(await remoteContainsText('published body')).toBe(false);
			expect(await remoteContainsText('private body')).toBe(false);
			expect(await remoteEncryptionApplied(privateNote.id)).toBe(1);
			expect(await heldBackIdsOn(newSyncTargetId)).toEqual([publishedNote.id]);
			expect(await heldBackIdsOn(oldSyncTargetId)).toEqual([publishedNote.id]);
		} finally {
			fileApi().setSyncTargetId(oldSyncTargetId);
			Setting.setValue('sync.target', oldSyncTargetId);
		}
	});

	it('should list held-back items without the warning for items that cannot be synchronised or a retry option, and keep them held back if they are retried', async () => {
		const note = await Note.save({ title: 'note', body: 'published body', is_shared: 1 });
		await synchronizerStart();

		const actions: AnyAction[] = [];
		await checkDisabledSyncItemsNotification(action => actions.push(action) && action);
		expect(actions).toContainEqual({ type: 'SYNC_PLAINTEXT_UPLOAD_HELD_BACK_ITEMS_SET', itemIds: [note.id] });
		expect(actions).toContainEqual({ type: 'SYNC_HAS_DISABLED_SYNC_ITEMS', value: false });
		const section = (await new ReportService().status(syncTargetId())).find(s => s.title === 'Items that cannot be synchronised');
		expect(section.body).toContainEqual(expect.objectContaining({ text: expect.stringContaining(note.id), canRetry: false }));

		// saveSyncEnabled deletes the sync_items row, after which the item is treated as never synced
		await BaseItem.saveSyncEnabled(ModelType.Note, note.id);
		await synchronizerStart();
		expect(await remoteContainsText('published body')).toBe(false);
		expect(await heldBackItemIds()).toEqual([note.id]);
	});

	// A remote change to a held-back edit is handled as a conflict by the delta step, and otherwise by the upload loop. The
	// conflict copy is uploaded encrypted.
	test.each([
		{ remoteChange: 'update', heldBackFirst: true },
		{ remoteChange: 'delete', heldBackFirst: true },
		{ remoteChange: 'update', heldBackFirst: false },
		{ remoteChange: 'delete', heldBackFirst: false },
	])('should keep local edits to a published note when another device changes it first, and handle them as a conflict (%j)', async ({ remoteChange, heldBackFirst }) => {
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		const masterKey = await enableEncryption();
		const service = setupShareService();

		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'original', parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();
		Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
		await loadMasterKeysFromSettings(encryptionService());
		await decryptionWorker().start();

		await switchClient(1);
		await service.publishFolder(folder.id);
		await syncConfirmingAll();

		await switchClient(2);
		await synchronizerStart();
		expect((await Note.load(note.id)).is_shared).toBe(1);
		await Note.save({ id: note.id, body: 'edit from device 2' });
		if (heldBackFirst) {
			await synchronizerStart();
			expect(await heldBackItemIds()).toEqual([note.id]);
		}

		await switchClient(1);
		await msleep(10);
		if (remoteChange === 'update') {
			await Note.save({ id: note.id, body: 'edit from device 1' });
		} else {
			await Note.delete(note.id);
		}
		await syncConfirmingAll();

		await switchClient(2);
		await synchronizerStart();
		await synchronizerStart();
		expect(await heldBackItemIds()).toEqual([]);
		// A conflict copy of a note that was deleted remotely has no conflict_original_id, so it isn't synced
		const conflictNote = (await Note.all()).find(n => n.is_conflict);
		if (remoteChange === 'update') expect(await remoteEncryptionApplied(conflictNote.id)).toBe(1);
		expect(await remoteContainsText('edit from device 2')).toBe(false);

		const bodies = (await Note.all()).map(n => n.body);
		expect(bodies).toContain('edit from device 2');
		if (remoteChange === 'update') expect(bodies).toContain('edit from device 1');
	});

	test.each([
		{ localChange: false, remoteDelete: false, expectedBody: 'first line\nsecond line\nremote edit', expectedHeldBack: false },
		{ localChange: true, remoteDelete: false, expectedBody: 'local edit\nsecond line\nremote edit', expectedHeldBack: true },
		{ localChange: false, remoteDelete: true, expectedBody: undefined, expectedHeldBack: false },
	])('should apply a remote change to a held-back published note, merging it with any local change (%j)', async ({ localChange, remoteDelete, expectedBody, expectedHeldBack }) => {
		const note = await Note.save({ title: 'note', body: 'first line\nsecond line\nthird line', is_shared: 1 });
		await synchronizerStart();
		await confirmUpload();

		if (localChange) {
			await Note.save({ id: note.id, body: 'local edit\nsecond line\nthird line' });
		} else {
			await fileApi().put(BaseItem.systemPath(note.id), await Note.serialize({ ...await Note.load(note.id), body: 'stale body' }));
			await BaseItem.forceSync(note.id);
		}
		await synchronizerStart();
		expect(await heldBackItemIds()).toEqual([note.id]);

		await msleep(10);
		if (remoteDelete) {
			await fileApi().delete(BaseItem.systemPath(note.id));
		} else {
			const remoteNote = { ...await Note.load(note.id), body: 'first line\nsecond line\nremote edit', updated_time: Date.now() };
			await fileApi().put(BaseItem.systemPath(note.id), await Note.serialize(remoteNote));
		}
		await synchronizerStart();
		await synchronizerStart();

		expect((await Note.load(note.id))?.body).toBe(expectedBody);
		expect((await Note.all()).filter(n => n.is_conflict)).toEqual([]);
		expect(await heldBackItemIds()).toEqual(expectedHeldBack ? [note.id] : []);
		expect(await remoteContainsText('local edit')).toBe(false);
	});

	it('should upload held-back items without confirming while unencrypted uploads are allowed, and keep private notes encrypted', async () => {
		// is_shared stands in for publish propagation
		const heldBack = await Note.save({ title: 'held back', body: 'held back body', is_shared: 1 });
		await synchronizerStart();
		expect(await heldBackItemIds()).toEqual([heldBack.id]);

		Setting.setValue('encryption.allowUnencryptedUploads', true);
		const privateNote = await Note.save({ title: 'private', body: 'private body' });
		await synchronizerStart();
		expect(await remoteContainsText('held back body')).toBe(true);
		expect(await remoteEncryptionApplied(privateNote.id)).toBe(1);
		expect(await heldBackItemIds()).toEqual([]);

		Setting.setValue('encryption.allowUnencryptedUploads', false);
		await Note.save({ id: heldBack.id, body: 'changed body' });
		await synchronizerStart();
		expect(await remoteContainsText('changed body')).toBe(false);
		expect(await heldBackItemIds()).toEqual([heldBack.id]);
	});

	it('should upload a newly published note and its listed attachments in one sync, and hold back anything else', async () => {
		const service = setupShareService();
		const listed = await shim.createResourceFromPath(`${supportDir}/photo.jpg`);
		const unlisted = await shim.createResourceFromPath(`${supportDir}/photo.jpg`);
		const note = await Note.save({ title: 'note', body: `![](:/${listed.id}) ![](:/${unlisted.id})` });
		await synchronizerStart();

		await service.shareNote(note.id, false);
		// Stands in for pressing the publish button, with only one of the attachments listed
		synchronizer().confirmPlaintextUploads(await newlyPublishedConfirmations([note.id], [listed.id]));
		await synchronizerStart();

		expect(await remoteEncryptionApplied(note.id)).toBe(0);
		expect(await heldBackItemIds()).toEqual([unlisted.id]);
		expect(await remotePlaintextResourceBlobCount()).toBe(1);

		await Note.save({ id: note.id, title: 'edited' });
		await synchronizerStart();
		expect(await heldBackItemIds()).toEqual([note.id, unlisted.id].sort());
	});

	it('should not hold back an unchanged note when copying its link again', async () => {
		const service = setupShareService();
		const note = await Note.save({ title: 'note', body: 'body' });
		await service.shareNote(note.id, false);
		await confirmUpload([note.id]);
		const updatedTime = (await Note.load(note.id)).updated_time;

		await msleep(2);
		await service.shareNote(note.id, false);
		await synchronizerStart();

		expect((await Note.load(note.id)).updated_time).toBe(updatedTime);
		expect(await heldBackItemIds()).toEqual([]);
	});

	it('should hold back an edit made after the user confirmed an earlier version', async () => {
		const note = await Note.save({ title: 'note', body: 'reviewed', is_shared: 1 });
		await synchronizerStart();

		await confirmCurrentVersions();
		await msleep(2);
		await Note.save({ id: note.id, body: 'written after approving' });
		await synchronizerStart();

		expect(await remoteContainsText('written after approving')).toBe(false);
		expect(await heldBackItemIds()).toEqual([note.id]);
	});

	it('should keep confirmations for items that a failed sync did not upload, still only for the confirmed version', async () => {
		const notes = [
			await Note.save({ title: 'note 1', body: 'body 1', is_shared: 1 }),
			await Note.save({ title: 'note 2', body: 'body 2', is_shared: 1 }),
		];
		await synchronizerStart();
		await confirmCurrentVersions();

		const putSpy = jest.spyOn(fileApi(), 'put').mockRejectedValue(new Error('Network request failed'));
		try {
			await synchronizerStart();
		} finally {
			putSpy.mockRestore();
		}
		expect(await remoteContainsText('body 1')).toBe(false);

		await msleep(2);
		await Note.save({ id: notes[1].id, body: 'edited after the failed sync' });
		await synchronizerStart();
		expect(await remoteContainsText('body 1')).toBe(true);
		expect(await remoteContainsText('edited after the failed sync')).toBe(false);
		expect(await heldBackItemIds()).toEqual([notes[1].id]);
	});

	// Results for an attachment that would be uploaded unencrypted stay on this device, so that they don't need confirming
	test.each([
		{ isShared: 1, expectedTimestampChange: false },
		{ isShared: 0, expectedTimestampChange: true },
	])('should not hold back an approved attachment again after OCR (%j)', async ({ isShared, expectedTimestampChange }) => {
		const resource = await Resource.save({ ...(await shim.createResourceFromPath(`${supportDir}/photo.jpg`)), is_shared: isShared, ocr_status: ResourceOcrStatus.Todo });
		await synchronizerStart();
		await confirmUpload();
		expect(await heldBackItemIds()).toEqual([]);
		const updatedTimeBeforeOcr = (await Resource.load(resource.id)).updated_time;

		class FakeOcrDriver extends OcrDriverBase {
			public override async recognize(): Promise<RecognizeResult> {
				return { ocr_status: ResourceOcrStatus.Done, ocr_text: 'text in the image', ocr_details: '', ocr_error: '' };
			}
		}
		await msleep(2);
		await new OcrService([new FakeOcrDriver()]).processResources();
		await synchronizerStart();

		const afterOcr = await Resource.load(resource.id);
		expect(afterOcr.ocr_text).toBe('text in the image');
		expect(afterOcr.updated_time !== updatedTimeBeforeOcr).toBe(expectedTimestampChange);
		expect(await heldBackItemIds()).toEqual([]);
	});

	test.each([
		{ item: 'publishedNote', change: 'trash', expectedHeldBack: false, expectedRemoteDeleted: true },
		{ item: 'noteInUnencryptedShare', change: 'trash', expectedHeldBack: false, expectedRemoteDeleted: true },
		{ item: 'notebookInUnencryptedShare', change: 'trash', expectedHeldBack: false, expectedRemoteDeleted: true },
		{ item: 'noteInUnencryptedShare', change: 'trashAndRename', expectedHeldBack: true, expectedRemoteDeleted: false },
		{ item: 'noteInUnencryptedShare', change: 'trashThenRestore', expectedHeldBack: false, expectedRemoteDeleted: false },
		{ item: 'notebookInUnencryptedShare', change: 'trashThenRestore', expectedHeldBack: false, expectedRemoteDeleted: false },
	] as const)('should only upload a trashed or restored item without asking if nothing else changed (%j)', async ({ item, change, expectedHeldBack, expectedRemoteDeleted }) => {
		const { id, itemType } = await createHeldBackItem(item);
		const ItemClass = BaseItem.getClassByItemType(itemType);
		await syncConfirmingAll();
		expect(await heldBackItemIds()).toEqual([]);

		await msleep(2);
		await ItemClass.delete(id, { toTrash: true });
		if (change === 'trashAndRename') await ItemClass.save({ id, title: 'renamed' });
		if (change === 'trashThenRestore') {
			await synchronizerStart();
			await msleep(2);
			await restoreItems(itemType, [id]);
		}
		await synchronizerStart();

		expect(await heldBackItemIds()).toEqual(expectedHeldBack ? [id] : []);
		expect(!!(await remoteNotesFoldersResources()).find(it => it.id === id).deleted_time).toBe(expectedRemoteDeleted);
	});

	// Folder.updateResourceShareIds gives each note its own copy of an attachment that several notes link to
	it('should keep another note\'s copy of an attachment encrypted when publishing a note that links to it', async () => {
		const service = setupShareService();
		const resource = await shim.createResourceFromPath(`${supportDir}/photo.jpg`);
		const privateNote = await Note.save({ title: 'private', body: `![](:/${resource.id})` });
		const note = await Note.save({ title: 'note', body: `![](:/${resource.id})` });
		await resourceService().indexNoteResources();
		await synchronizerStart();

		await service.shareNote(note.id, false);
		synchronizer().confirmPlaintextUploads(await newlyPublishedConfirmations([note.id], [resource.id]));
		await synchronizerStart();

		const privateResourceIds = await Note.linkedResourceIds((await Note.load(privateNote.id)).body);
		expect(privateResourceIds).toHaveLength(1);
		expect((await Resource.load(privateResourceIds[0])).is_shared).toBe(0);
		expect(await remoteEncryptionApplied(privateResourceIds[0])).toBe(1);
		expect(await remoteEncryptionApplied(note.id)).toBe(0);
	});

	// Another client deletes an attachment as an orphan once no note there links to it, because it can't see the
	// held-back note that now does
	it.each([
		'attachment confirmed before the deletion',
		'attachment held back at the deletion',
		'note and attachment confirmed in the sync that sees the deletion',
		'note confirmed before the attachment, after the deletion',
	])('should keep an attachment deleted remotely while a held-back note links to it: %s', async (variant) => {
		const service = setupShareService();
		const resource = await shim.createResourceFromPath(`${supportDir}/photo.jpg`);
		const privateNote = await Note.save({ title: 'private', body: `![](:/${resource.id})` });
		const publishedNote = await Note.save({ title: 'published' });
		await resourceService().indexNoteResources();
		await synchronizerStart();
		await service.shareNote(publishedNote.id, false);
		await syncConfirmingAll();

		await Note.save({ id: privateNote.id, body: '' });
		await Note.save({ id: publishedNote.id, body: `![](:/${resource.id})` });
		await resourceService().indexNoteResources();
		await synchronizerStart();
		await synchronizerStart();
		expect(await heldBackItemIds()).toEqual([publishedNote.id, resource.id].sort());
		if (variant === 'attachment confirmed before the deletion') await confirmUpload([resource.id]);

		await fileApi().delete(BaseItem.systemPath(resource.id));
		await fileApi().delete(`.resource/${resource.id}`);
		if (variant === 'note and attachment confirmed in the sync that sees the deletion') {
			await confirmCurrentVersions();
			await synchronizerStart();
		} else {
			await synchronizerStart();
			await synchronizerStart();
			expect(await heldBackItemIds()).toEqual([publishedNote.id, resource.id].sort());
			if (variant === 'note confirmed before the attachment, after the deletion') await confirmUpload([publishedNote.id]);
			await confirmUpload();
		}

		expect((await Resource.all()).map(r => r.id)).toEqual([resource.id]);
		expect(await remoteEncryptionApplied(resource.id)).toBe(0);
		expect(await remotePlaintextResourceBlobCount()).toBe(1);
	});
});
