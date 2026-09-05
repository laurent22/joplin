import Note from '../../models/Note';
import { createFolderTree, encryptionService, loadEncryptionMasterKey, msleep, resourceService, setupDatabaseAndSynchronizer, simulateReadOnlyShareEnv, supportDir, switchClient, synchronizerStart } from '../../testing/test-utils';
import ShareService, { ApiShare } from './ShareService';
import { ShareType, StateShare } from './reducer';
import { NoteEntity, ResourceEntity } from '../database/types';
import Folder from '../../models/Folder';
import { localSyncInfo, setEncryptionEnabled, setPpk } from '../synchronizer/syncInfoUtils';
import { generateKeyPair } from '../e2ee/ppk/ppk';
import MasterKey from '../../models/MasterKey';
import { MasterKeyEntity } from '../e2ee/types';
import { generateMasterKeyAndEnableEncryption, loadMasterKeysFromSettings, setupAndEnableEncryption, updateMasterPassword } from '../e2ee/utils';
import Logger, { LogLevel } from '@joplin/utils/Logger';
import shim from '../../shim';
import Resource from '../../models/Resource';
import { readFile } from 'fs-extra';
import BaseItem from '../../models/BaseItem';
import ResourceService from '../ResourceService';
import Setting from '../../models/Setting';
import { ModelType } from '../../BaseModel';
import { remoteNotesFoldersResources } from '../../testing/test-utils-synchronizer';
import mockShareService from '../../testing/share/mockShareService';

const testImagePath = `${supportDir}/photo.jpg`;


const mockServiceForNoteSharing = () => {
	return mockShareService({
		getShares: async () => {
			return { items: [] };
		},
		postShares: async () => null,
		getShareInvitations: async () => null,
	});
};

describe('ShareService', () => {

	jest.retryTimes(2);

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should not change the note user timestamps when sharing or unsharing', async () => {
		let note = await Note.save({});
		const service = mockServiceForNoteSharing();
		await msleep(1);
		await service.shareNote(note.id, false);

		function checkTimestamps(previousNote: NoteEntity, newNote: NoteEntity) {
			// After sharing or unsharing, only the updated_time property should
			// be updated, for sync purposes. All other timestamps shouldn't
			// change.
			expect(previousNote.user_created_time).toBe(newNote.user_created_time);
			expect(previousNote.user_updated_time).toBe(newNote.user_updated_time);
			expect(previousNote.updated_time < newNote.updated_time).toBe(true);
			expect(previousNote.created_time).toBe(newNote.created_time);
		}

		{
			const noteReloaded = await Note.load(note.id);
			checkTimestamps(note, noteReloaded);
			note = noteReloaded;
		}

		await msleep(1);
		await service.unshareNote(note.id);

		{
			const noteReloaded = await Note.load(note.id);
			checkTimestamps(note, noteReloaded);
		}
	});

	it('should not encrypt items that are shared', async () => {
		const folder = await Folder.save({});
		const note = await Note.save({ parent_id: folder.id });
		await shim.attachFileToNote(note, testImagePath);

		const service = mockServiceForNoteSharing();

		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		await synchronizerStart();

		let previousBlobUpdatedTime = Infinity;
		{
			const allItems = await remoteNotesFoldersResources();
			expect(allItems.map(it => it.encryption_applied)).toEqual([1, 1, 1]);
			previousBlobUpdatedTime = allItems.find(it => it.type_ === ModelType.Resource).blob_updated_time;
		}

		await service.shareNote(note.id, false);
		await msleep(1);
		await Folder.updateAllShareIds(resourceService(), []);

		await synchronizerStart();

		{
			const allItems = await remoteNotesFoldersResources();
			expect(allItems.find(it => it.type_ === ModelType.Note).encryption_applied).toBe(0);
			expect(allItems.find(it => it.type_ === ModelType.Folder).encryption_applied).toBe(1);

			const resource: ResourceEntity = allItems.find(it => it.type_ === ModelType.Resource);
			expect(resource.encryption_applied).toBe(0);

			// Indicates that both the metadata and blob have been decrypted on
			// the sync target.
			expect(resource.blob_updated_time).toBe(resource.updated_time);
			expect(resource.blob_updated_time).toBeGreaterThan(previousBlobUpdatedTime);
		}
	});

	function testShareFolderService(extraExecHandlers: Record<string, (query: unknown, body: unknown)=> unknown> = {}) {
		let nextShareId = 1;
		let shares: ApiShare[] = [];
		const shareByFolderId = (folderId: string) => {
			return shares.find(share => share.folder_id === folderId);
		};

		return mockShareService({
			onExec: async (method: string, path: string, query: Record<string, unknown>, body: unknown) => {
				if (extraExecHandlers[`${method} ${path}`]) return extraExecHandlers[`${method} ${path}`](query, body);

				if (method === 'GET' && path === 'api/shares') {
					return {
						items: [...shares],
					};
				}

				if (method === 'POST' && path === 'api/shares') {
					const b = body as { folder_id: string; master_key_id: string };
					// Return the existing share, if it exists. This is to match the behavior
					// of Joplin Server.
					const existingShare = shareByFolderId(b.folder_id);
					if (existingShare) {
						return existingShare;
					}

					// Use a predictable ID:
					const id = `share_${nextShareId++}`;

					const share = {
						id,
						master_key_id: b.master_key_id,
						folder_id: b.folder_id,
					};
					shares.push(share);
					return share;
				}

				if (method === 'DELETE' && path.startsWith('api/shares/')) {
					const id = path.replace(/^api\/shares\//, '');
					shares = shares.filter(share => share.id !== id);
					return undefined;
				}

				throw new Error(`Unhandled: ${method} ${path}`);
			},
		});
	}

	const prepareNoteFolderResource = async () => {
		const folder = await Folder.save({});
		let note = await Note.save({ parent_id: folder.id });
		note = await shim.attachFileToNote(note, testImagePath);
		const resourceId = (await Note.linkedResourceIds(note.body))[0];
		const resource = await Resource.load(resourceId);

		await resourceService().indexNoteResources();

		return { folder, note, resource };
	};

	async function testShareFolder(service: ShareService) {
		const { folder, note, resource } = await prepareNoteFolderResource();
		const share = await service.shareFolder(folder.id);
		expect(share.id).toBe('share_1');
		expect((await Folder.load(folder.id)).share_id).toBe('share_1');
		expect((await Note.load(note.id)).share_id).toBe('share_1');
		expect((await Resource.load(resource.id)).share_id).toBe('share_1');

		return { share, folder, note, resource };
	}

	it('should share a folder', async () => {
		await testShareFolder(testShareFolderService());
	});

	it('should share a folder - E2EE', async () => {
		const masterKey = await loadEncryptionMasterKey();
		await setupAndEnableEncryption(encryptionService(), masterKey, '111111');
		const ppk = await generateKeyPair(encryptionService(), '111111');
		setPpk(ppk);

		const shareService = testShareFolderService();

		expect(await MasterKey.count()).toBe(1);

		let { folder, note, resource } = await prepareNoteFolderResource();

		BaseItem.shareService_ = shareService;
		Resource.shareService_ = shareService;

		await shareService.shareFolder(folder.id);

		await Folder.updateAllShareIds(resourceService(), []);

		// The share service should automatically create a new encryption key
		// specifically for that shared folder
		expect(await MasterKey.count()).toBe(2);

		folder = await Folder.load(folder.id);
		note = await Note.load(note.id);
		resource = await Resource.load(resource.id);

		// The key that is not the master key is the folder key
		const folderKey = (await MasterKey.all()).find(mk => mk.id !== masterKey.id);

		// Double-check that it's going to encrypt the folder using the shared
		// key (and not the user's own master key)
		expect(folderKey.id).not.toBe(masterKey.id);
		expect(folder.master_key_id).toBe(folderKey.id);

		await loadMasterKeysFromSettings(encryptionService());

		try {
			const serializedNote = await Note.serializeForSync(note);
			expect(serializedNote).toContain(folderKey.id);

			// The resource should be encrypted using the above key (if it is,
			// the key ID will be in the header).
			const result = await Resource.fullPathForSyncUpload(resource);
			const content = await readFile(result.path, 'utf8');
			expect(content).toContain(folderKey.id);

			{
				await synchronizerStart();
				const remoteItems = await remoteNotesFoldersResources();
				expect(remoteItems.map(it => it.encryption_applied)).toEqual([1, 1, 1]);
			}
		} finally {
			BaseItem.shareService_ = shareService;
			Resource.shareService_ = null;
		}
	});

	it('should add a recipient', async () => {
		setEncryptionEnabled(true);
		await updateMasterPassword('', '111111');
		const ppk = await generateKeyPair(encryptionService(), '111111');
		setPpk(ppk);
		const recipientPpk = await generateKeyPair(encryptionService(), '222222');
		expect(ppk.id).not.toBe(recipientPpk.id);

		let uploadedEmail = '';
		let uploadedMasterKey: MasterKeyEntity = null;

		const service = testShareFolderService({
			'GET api/users/toto%40example.com/public_key': async (_query, _body) => {
				return recipientPpk;
			},
			'POST api/shares/share_1/users': async (_query, body) => {
				const b = body as { email: string; master_key: string };
				uploadedEmail = b.email;
				uploadedMasterKey = JSON.parse(b.master_key);
			},
		});

		const { share } = await testShareFolder(service);

		await service.addShareRecipient(share.id, share.master_key_id, 'toto@example.com', { can_read: 1, can_write: 1 });

		expect(uploadedEmail).toBe('toto@example.com');

		const content = JSON.parse(uploadedMasterKey.content);
		expect(recipientPpk.id).toBe(content.ppkId);
	});

	it('should not update the folder\'s master_key_id when shareFolder is called multiple times', async () => {
		await generateMasterKeyAndEnableEncryption(encryptionService(), 'testing!');
		const ppk = await generateKeyPair(encryptionService(), '111111');
		setPpk(ppk);

		expect(localSyncInfo().e2ee).toBe(true);
		expect(localSyncInfo().masterKeys).toHaveLength(1);

		const service = testShareFolderService();
		const { share, folder } = await testShareFolder(service);
		// Should have created a new master key for the share
		expect(localSyncInfo().masterKeys).toHaveLength(2);
		expect(
			localSyncInfo().masterKeys.some(key => key.id === share.master_key_id),
		).toBe(true);

		// Sharing an already-shared folder should keep the existing key:
		const share2 = await service.shareFolder(folder.id);
		expect(share2.master_key_id).toBe(share.master_key_id);
		expect(await Folder.load(folder.id)).toHaveProperty('master_key_id', share.master_key_id);
		// Should not have added a new master key
		expect(localSyncInfo().masterKeys).toHaveLength(2);
	});

	// On CI this test can randomly throw "Exceeded timeout of 90000 ms for a
	// test." because of the multiple RSA key generation and master key
	// encryption steps. Increase the timeout as a backstop in addition to the
	// suite-level `jest.retryTimes(2)`.
	it('should use a different master key when folders are unshared, then shared again', async () => {
		await generateMasterKeyAndEnableEncryption(encryptionService(), 'testing!');
		const ppk = await generateKeyPair(encryptionService(), '111111');
		setPpk(ppk);

		const service = testShareFolderService();
		const { share, folder } = await testShareFolder(service);
		await service.refreshShares();
		await service.unshareFolder(folder.id);
		const share2 = await service.shareFolder(folder.id);

		expect(share2.master_key_id).toBeTruthy();
		expect(share2.folder_id).toBe(folder.id);
		expect(share.master_key_id).not.toBe(share2.master_key_id);
	}, 60000 * 5);

	it('should leave folders that are no longer with the user', async () => {
		// `checkShareConsistency` will emit a warning so we need to silent it
		// in tests.
		const previousLogLevel = Logger.globalLogger.setLevel(LogLevel.Error);

		// checkShareConsistency only runs when the sync target supports
		// sharing (Joplin Server/Cloud).
		Setting.setValue('sync.target', 9);

		const service = testShareFolderService({
			'GET api/shares': async (_query, _body) => {
				return {
					items: [],
					has_more: false,
				};
			},
		});

		const folder = await Folder.save({ share_id: 'nolongershared' });
		await service.checkShareConsistency();
		expect(await Folder.load(folder.id)).toBeFalsy();

		Logger.globalLogger.setLevel(previousLogLevel);
	});

	it('should skip share consistency check when not using a share-compatible sync target', async () => {
		// Simulate a non-Joplin Server sync target (e.g. WebDAV = 6).
		// This reproduces the scenario where a user previously used Joplin
		// Server (which set share_id on folders), then switched to WebDAV.
		// checkShareConsistency() should not attempt to call the Joplin
		// Server API since we are no longer on a share-capable sync target.
		Setting.setValue('sync.target', 6);

		const service = mockShareService({
			onExec: async () => {
				throw new Error('Should not call the API when share is not enabled');
			},
		});

		// Create a folder with a stale share_id leftover from Joplin Server
		const folder = await Folder.save({ share_id: 'stale_share_id' });

		// This should not throw or attempt any API calls
		await service.checkShareConsistency();

		// The folder should still exist since we cannot verify shares
		// without a Joplin Server API connection
		expect(await Folder.load(folder.id)).toBeTruthy();
	});

	it('should leave a shared folder', async () => {
		const folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
				],
			},
		]);

		const resourceService = new ResourceService();
		await Folder.save({ id: folder1.id, share_id: '123456789' });
		await Folder.updateAllShareIds(resourceService, []);

		const cleanup = simulateReadOnlyShareEnv('123456789');

		const shareService = testShareFolderService();
		await shareService.leaveSharedFolder(folder1.id, 'somethingrandom');

		expect(await Folder.count()).toBe(0);
		expect(await Note.count()).toBe(0);

		const deletedItems = await BaseItem.deletedItems(Setting.value('sync.target'));

		expect(deletedItems.length).toBe(1);
		expect(deletedItems[0].item_type).toBe(ModelType.Folder);
		expect(deletedItems[0].item_id).toBe(folder1.id);

		cleanup();
	});

	it('should not return a published folder share when looking up a regular folder share', async () => {
		const service = mockShareService({
			getShares: async () => ({
				items: [{
					id: 'share1',
					type: ShareType.PublishedFolder,
					folder_id: 'folder1',
					note_id: '',
					master_key_id: '',
				}],
			}),
			postShares: async () => null,
			getShareInvitations: async () => ({ items: [] }),
		});

		await service.refreshShares();

		expect(service.folderShare('folder1')).toBeUndefined();
	});

	it('should unpublish a folder and all its children', async () => {
		const folderA = await Folder.save({ title: 'folder A' });
		const folderB = await Folder.save({ title: 'folder B', parent_id: folderA.id });
		const noteA = await Note.save({ title: 'note A', parent_id: folderA.id });
		const noteB = await Note.save({ title: 'note B', parent_id: folderB.id });

		let serverShares: StateShare[] = [];
		const deletedShareIds: string[] = [];
		const service = mockShareService({
			onExec: async (method, path) => {
				if (method === 'GET' && path === 'api/shares') {
					return { items: serverShares };
				}
				if (method === 'POST' && path === 'api/shares') {
					const share: StateShare = {
						id: 'published-folder-a',
						type: ShareType.PublishedFolder,
						folder_id: folderA.id,
						note_id: '',
						master_key_id: '',
					};
					serverShares.push(share);
					return share;
				}
				if (method === 'DELETE' && path.startsWith('api/shares/')) {
					const shareId = path.substring('api/shares/'.length);
					deletedShareIds.push(shareId);
					serverShares = serverShares.filter(share => share.id !== shareId);
					return null;
				}
				throw new Error(`Unhandled: ${method} ${path}`);
			},
		});

		await service.publishFolder(folderA.id);
		await Folder.save({ id: folderA.id, is_shared: 1 });
		await Folder.save({ id: folderB.id, is_shared: 1 });
		await Note.save({ id: noteA.id, parent_id: folderA.id, is_shared: 1 });
		await Note.save({ id: noteB.id, parent_id: folderB.id, is_shared: 1 });

		expect((await Folder.load(folderA.id)).is_shared).toBe(1);
		expect((await Folder.load(folderB.id)).is_shared).toBe(1);
		expect((await Note.load(noteA.id)).is_shared).toBe(1);
		expect((await Note.load(noteB.id)).is_shared).toBe(1);

		await service.unpublishFolder(folderA.id);

		expect(deletedShareIds).toEqual(['published-folder-a']);
		expect((await Folder.load(folderA.id)).is_shared).toBe(0);
		expect((await Folder.load(folderB.id)).is_shared).toBe(0);
		expect((await Note.load(noteA.id)).is_shared).toBe(0);
		expect((await Note.load(noteB.id)).is_shared).toBe(0);
	});

	it('should recover if app closes while unpublishing a folder', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });
		const share = {
			id: 'published-folder',
			type: ShareType.PublishedFolder,
			folder_id: folder.id,
		};
		let serverShares = [share];
		const service = mockShareService({
			onExec: async (method, path) => {
				if (method === 'GET' && path === 'api/shares') return { items: serverShares };
				if (method === 'DELETE' && path === `api/shares/${share.id}`) {
					serverShares = [];
					return null;
				}
				throw new Error(`Unhandled: ${method} ${path}`);
			},
		});

		await service.refreshShares();
		await Folder.save({ id: folder.id, is_shared: 1 });
		await Note.save({ id: note.id, parent_id: folder.id, is_shared: 1 });

		const updateShareStatusSpy = jest.spyOn(Folder, 'updateShareStatus').mockImplementationOnce(async (item, isShared) => {
			await BaseItem.updateShareStatus(item, isShared);
			throw new Error('App closed');
		});
		try {
			await expect(service.unpublishFolder(folder.id)).rejects.toThrow('App closed');
		} finally {
			updateShareStatusSpy.mockRestore();
		}

		expect(serverShares).toEqual([share]);

		const restartedService = mockShareService({
			getShares: async () => ({ items: serverShares }),
			postShares: async () => null,
			getShareInvitations: async () => ({ items: [] }),
		});
		await restartedService.refreshShares();
		await Folder.updateAllShareIds(resourceService(), restartedService.shares);

		expect((await Folder.load(folder.id)).is_shared).toBe(1);
		expect((await Note.load(note.id)).is_shared).toBe(1);
	});

	it('should keep a separately published child folder and child note published', async () => {
		const folderA = await Folder.save({ title: 'folder A' });
		const folderB = await Folder.save({ title: 'folder B', parent_id: folderA.id });
		const noteA = await Note.save({ title: 'note A', parent_id: folderA.id });
		const publishedFolderAShare = {
			id: 'published-folder-a',
			type: ShareType.PublishedFolder,
			folder_id: folderA.id,
		};
		const publishedFolderBShare = {
			id: 'published-folder-b',
			type: ShareType.PublishedFolder,
			folder_id: folderB.id,
		};
		const publishedNoteAShare = {
			id: 'published-note-a',
			type: ShareType.Note,
			note_id: noteA.id,
		};
		let sharesReturnedByServer = [publishedFolderAShare, publishedFolderBShare, publishedNoteAShare];
		const service = mockShareService({
			getShares: async () => ({ items: sharesReturnedByServer }),
			postShares: async () => null,
			getShareInvitations: async () => ({ items: [] }),
		});

		await service.refreshShares();
		await Folder.save({ id: folderA.id, is_shared: 1 });
		await Folder.save({ id: folderB.id, is_shared: 1 });
		await Note.save({ id: noteA.id, parent_id: folderA.id, is_shared: 1 });
		sharesReturnedByServer = [publishedFolderBShare, publishedNoteAShare];

		await service.unpublishFolder(folderA.id);

		expect(service.shares).toEqual([publishedFolderBShare, publishedNoteAShare]);
		expect((await Folder.load(folderA.id)).is_shared).toBe(0);
		expect((await Folder.load(folderB.id)).is_shared).toBe(1);
		expect((await Note.load(noteA.id)).is_shared).toBe(1);
	});

	it('should throw when the folder or its published share does not exist', async () => {
		const folderA = await Folder.save({ title: 'folder A' });
		let deleteCallCount = 0;
		const service = mockShareService({
			onExec: async (method, path) => {
				if (method === 'GET' && path === 'api/shares') {
					return { items: [] };
				}
				if (method === 'DELETE') {
					deleteCallCount++;
					return null;
				}
				throw new Error(`Unhandled: ${method} ${path}`);
			},
		});

		await service.refreshShares();

		await expect(service.unpublishFolder('000000000000000000000000000000F9')).rejects.toThrow('No such folder: 000000000000000000000000000000F9');
		await expect(service.unpublishFolder(folderA.id)).rejects.toThrow(`No published share for folder: ${folderA.id}`);
		expect(deleteCallCount).toBe(0);
	});

	it('should throw when publishing a folder that does not exist', async () => {
		const service = mockShareService({
			getShares: async () => ({ items: [] }),
			postShares: async () => null,
			getShareInvitations: async () => ({ items: [] }),
		});

		await expect(service.publishFolder('000000000000000000000000000000F9')).rejects.toThrow('No such folder: 000000000000000000000000000000F9');
	});

	it('should drop a deleted share from live state so locking works again', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const service = testShareFolderService();
		const { folder } = await testShareFolder(service);
		await service.refreshShares();
		expect(service.shares).toHaveLength(1);

		await service.unshareFolder(folder.id);

		// Left behind, the note lock guard would keep rejecting until the next sync refreshed it.
		expect(service.shares).toHaveLength(0);
	});

	it('should drop a deleted note share from live state right after unsharing', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });
		const serverShares = [
			{ id: 'share_n1', type: ShareType.Note, note_id: note.id, folder_id: '', master_key_id: '' },
			{ id: 'share_u1', type: ShareType.Folder, note_id: '', folder_id: 'unrelated-folder', master_key_id: '' },
		];
		const service = testShareFolderService({
			'GET api/shares': () => ({ items: [...serverShares] }),
		});
		await service.refreshShares();
		expect(service.shares).toHaveLength(2);

		await service.unshareNote(note.id);

		// Only the deleted share leaves; an unrelated active share must survive the eviction.
		expect(service.shares.map(s => s.id)).toEqual(['share_u1']);
	});

	// The remote DELETE can succeed and the follow-up refresh fail, so the share must leave live
	// state before the refresh, or the note lock guard keeps rejecting until a later sync.
	it('should drop a deleted published folder share from live state even when the refresh fails', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const folder = await Folder.save({ title: 'folder' });
		const serverShares = [
			{ id: 'share_p1', type: ShareType.PublishedFolder, note_id: '', folder_id: folder.id, master_key_id: '' },
			{ id: 'share_u1', type: ShareType.Folder, note_id: '', folder_id: 'unrelated-folder', master_key_id: '' },
		];
		let failGet = false;
		const service = testShareFolderService({
			'GET api/shares': () => {
				if (failGet) throw new Error('network down');
				return { items: [...serverShares] };
			},
		});
		await service.refreshShares();
		expect(service.shares).toHaveLength(2);

		failGet = true;
		await expect(service.unpublishFolder(folder.id)).rejects.toThrow('network down');

		expect(service.shares.map(s => s.id)).toEqual(['share_u1']);
	});

	// The eviction must come after the remote DELETE: a failed DELETE means the share still
	// exists remotely, so forgetting it locally would let a locked note slip into it.
	it('should keep the share in live state when the remote delete fails', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });
		const serverShares = [
			{ id: 'share_n1', type: ShareType.Note, note_id: note.id, folder_id: '', master_key_id: '' },
			{ id: 'share_p1', type: ShareType.PublishedFolder, note_id: '', folder_id: folder.id, master_key_id: '' },
		];
		const service = testShareFolderService({
			'GET api/shares': () => ({ items: [...serverShares] }),
			'DELETE api/shares/share_n1': () => { throw new Error('network down'); },
			'DELETE api/shares/share_p1': () => { throw new Error('network down'); },
		});
		await service.refreshShares();

		await expect(service.unshareNote(note.id)).rejects.toThrow('network down');
		await expect(service.unpublishFolder(folder.id)).rejects.toThrow('network down');
		expect(service.shares).toHaveLength(2);
	});

	it('should refuse to share a folder containing a locked note, before posting or moving it', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const parent = await Folder.save({ title: 'parent' });
		const folder = await Folder.save({ title: 'to share', parent_id: parent.id });
		await Note.save({ title: 'locked', parent_id: folder.id, is_locked: 1 });

		const postShares = jest.fn();
		const service = testShareFolderService({ 'POST api/shares': postShares });

		await expect(service.shareFolder(folder.id)).rejects.toThrow();
		expect(postShares).not.toHaveBeenCalled();
		// Sharing moves a nested folder to the root, so an unchanged parent shows nothing ran.
		expect((await Folder.load(folder.id)).parent_id).toBe(parent.id);
	});

	it('should refuse to publish a locked note or a folder holding one', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'locked', parent_id: folder.id, is_locked: 1 });

		const postShares = jest.fn();
		const service = testShareFolderService({ 'POST api/shares': postShares });

		await expect(service.shareNote(note.id, false)).rejects.toThrow();
		await expect(service.publishFolder(folder.id)).rejects.toThrow();
		expect(postShares).not.toHaveBeenCalled();
	});

	// Trash is a soft delete that keeps the parent, so restoring the note afterwards would
	// publish it on the next sync without the user ever choosing to.
	it('should refuse to publish a folder whose only locked note is in the trash', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const folder = await Folder.save({ title: 'folder' });
		await Note.save({ title: 'locked', parent_id: folder.id, is_locked: 1, deleted_time: 1 });

		const postShares = jest.fn();
		const service = testShareFolderService({ 'POST api/shares': postShares });

		await expect(service.publishFolder(folder.id)).rejects.toThrow();
		expect(postShares).not.toHaveBeenCalled();
	});

	it('should leave sharing and publishing alone when note lock is disabled', async () => {
		Setting.setValue('featureFlag.noteLock', false);
		const toShare = await Folder.save({ title: 'to share' });
		const toPublish = await Folder.save({ title: 'to publish' });
		const note = await Note.save({ title: 'locked', parent_id: toPublish.id, is_locked: 1 });
		await Note.save({ title: 'locked too', parent_id: toShare.id, is_locked: 1 });

		await expect(testShareFolderService().shareFolder(toShare.id)).resolves.toBeTruthy();
		await expect(testShareFolderService().shareNote(note.id, false)).resolves.toBeTruthy();
		await expect(testShareFolderService().publishFolder(toPublish.id)).resolves.toBeTruthy();
	});

});
