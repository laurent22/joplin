import Note from '../../models/Note';
import { createFolderTree, encryptionService, loadEncryptionMasterKey, msleep, resourceService, setupDatabaseAndSynchronizer, simulateReadOnlyShareEnv, supportDir, switchClient, synchronizerStart } from '../../testing/test-utils';
import ShareService from './ShareService';
import { NoteEntity, ResourceEntity } from '../database/types';
import Folder from '../../models/Folder';
import { setEncryptionEnabled, setPpk } from '../synchronizer/syncInfoUtils';
import { generateKeyPair } from '../e2ee/ppk';
import MasterKey from '../../models/MasterKey';
import { MasterKeyEntity } from '../e2ee/types';
import { loadMasterKeysFromSettings, setupAndEnableEncryption, updateMasterPassword } from '../e2ee/utils';
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

interface TestShareFolderServiceOptions {
	master_key_id?: string;
}

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
		await Folder.updateAllShareIds(resourceService());

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

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	function testShareFolderService(extraExecHandlers: Record<string, Function> = {}, options: TestShareFolderServiceOptions = {}) {
		return mockShareService({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			onExec: async (method: string, path: string, query: Record<string, any>, body: any) => {
				if (extraExecHandlers[`${method} ${path}`]) return extraExecHandlers[`${method} ${path}`](query, body);

				if (method === 'GET' && path === 'api/shares') {
					return {
						items: [
							{
								id: 'share_1',
								master_key_id: options.master_key_id,
							},
						],
					};
				}

				if (method === 'POST' && path === 'api/shares') {
					return {
						id: 'share_1',
					};
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

		let shareService = testShareFolderService();

		expect(await MasterKey.count()).toBe(1);

		let { folder, note, resource } = await prepareNoteFolderResource();

		BaseItem.shareService_ = shareService;
		Resource.shareService_ = shareService;

		await shareService.shareFolder(folder.id);

		await Folder.updateAllShareIds(resourceService());

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

		// Reload the service so that the mocked calls use the newly created key
		shareService = testShareFolderService({}, { master_key_id: folderKey.id });

		BaseItem.shareService_ = shareService;
		Resource.shareService_ = shareService;

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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			'POST api/shares': (_query: Record<string, any>, body: any) => {
				return {
					id: 'share_1',
					master_key_id: body.master_key_id,
				};
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			'GET api/users/toto%40example.com/public_key': async (_query: Record<string, any>, _body: any) => {
				return recipientPpk;
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			'POST api/shares/share_1/users': async (_query: Record<string, any>, body: any) => {
				uploadedEmail = body.email;
				uploadedMasterKey = JSON.parse(body.master_key);
			},
		});

		const { share } = await testShareFolder(service);

		await service.addShareRecipient(share.id, share.master_key_id, 'toto@example.com', { can_read: 1, can_write: 1 });

		expect(uploadedEmail).toBe('toto@example.com');

		const content = JSON.parse(uploadedMasterKey.content);
		expect(content.ppkId).toBe(recipientPpk.id);
	});

	it('should leave folders that are no longer with the user', async () => {
		// `checkShareConsistency` will emit a warning so we need to silent it
		// in tests.
		const previousLogLevel = Logger.globalLogger.setLevel(LogLevel.Error);

		const service = testShareFolderService({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			'GET api/shares': async (_query: Record<string, any>, _body: any): Promise<any> => {
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
		await Folder.updateAllShareIds(resourceService);

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

});
