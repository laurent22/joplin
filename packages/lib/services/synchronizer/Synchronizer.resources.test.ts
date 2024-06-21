import time from '../../time';
import shim from '../../shim';
import Setting from '../../models/Setting';
import { NoteEntity, ResourceEntity } from '../../services/database/types';
import { remoteNotesFoldersResources, remoteResources } from '../../testing/test-utils-synchronizer';
import { synchronizerStart, tempFilePath, resourceFetcher, supportDir, setupDatabaseAndSynchronizer, synchronizer, fileApi, switchClient, syncTargetId, encryptionService, loadEncryptionMasterKey, fileContentEqual, checkThrowAsync, msleep } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Resource from '../../models/Resource';
import ResourceFetcher from '../../services/ResourceFetcher';
import BaseItem from '../../models/BaseItem';
import { ModelType } from '../../BaseModel';
import { setEncryptionEnabled } from '../synchronizer/syncInfoUtils';
import { loadMasterKeysFromSettings } from '../e2ee/utils';

let insideBeforeEach = false;

describe('Synchronizer.resources', () => {

	beforeEach(async () => {
		insideBeforeEach = true;

		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);

		insideBeforeEach = false;
	});

	it('should sync resources', async () => {
		while (insideBeforeEach) await time.msleep(500);

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		const resource1 = (await Resource.all())[0];
		const resourcePath1 = Resource.fullPath(resource1);
		await synchronizerStart();
		expect((await remoteNotesFoldersResources()).length).toBe(3);

		await switchClient(2);

		await synchronizerStart();
		const allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		let resource1_2 = allResources[0];
		let ls = await Resource.localState(resource1_2);
		expect(resource1_2.id).toBe(resource1.id);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_IDLE);

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(resource1_2.id);
		await fetcher.waitForAllFinished();

		resource1_2 = await Resource.load(resource1.id);
		ls = await Resource.localState(resource1_2);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);

		const resourcePath1_2 = Resource.fullPath(resource1_2);
		expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
	});

	it('should handle resource download errors', async () => {
		while (insideBeforeEach) await time.msleep(500);

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		const fetcher = new ResourceFetcher(() => {
			return {
			// Simulate a failed download
				// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
				get: () => { return new Promise((_resolve: Function, reject: Function) => { reject(new Error('did not work')); }); },
			};
		});
		fetcher.queueDownload_(resource1.id);
		await fetcher.waitForAllFinished();

		resource1 = await Resource.load(resource1.id);
		const ls = await Resource.localState(resource1);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_ERROR);
		expect(ls.fetch_error).toBe('did not work');
	});

	it('should set the resource file size if it is missing', async () => {
		while (insideBeforeEach) await time.msleep(500);

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		let r1 = (await Resource.all())[0];
		await Resource.setFileSizeOnly(r1.id, -1);
		r1 = await Resource.load(r1.id);
		expect(r1.size).toBe(-1);

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(r1.id);
		await fetcher.waitForAllFinished();
		r1 = await Resource.load(r1.id);
		expect(r1.size).toBe(2720);
	});

	it('should delete resources', async () => {
		while (insideBeforeEach) await time.msleep(500);

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		const resource1 = (await Resource.all())[0];
		const resourcePath1 = Resource.fullPath(resource1);
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		let allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		expect((await remoteNotesFoldersResources()).length).toBe(3);
		await Resource.delete(resource1.id);
		await synchronizerStart();
		expect((await remoteNotesFoldersResources()).length).toBe(2);

		const remoteBlob = await fileApi().stat(`.resource/${resource1.id}`);
		expect(!remoteBlob).toBe(true);

		await switchClient(1);

		expect(await shim.fsDriver().exists(resourcePath1)).toBe(true);
		await synchronizerStart();
		allResources = await Resource.all();
		expect(allResources.length).toBe(0);
		expect(await shim.fsDriver().exists(resourcePath1)).toBe(false);
	});

	it('should encrypt resources', async () => {
		setEncryptionEnabled(true);
		const masterKey = await loadEncryptionMasterKey();

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		const resource1 = (await Resource.all())[0];
		const resourcePath1 = Resource.fullPath(resource1);
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
		await loadMasterKeysFromSettings(encryptionService());

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(resource1.id);
		await fetcher.waitForAllFinished();

		let resource1_2 = (await Resource.all())[0];
		resource1_2 = await Resource.decrypt(resource1_2);
		const resourcePath1_2 = Resource.fullPath(resource1_2);

		expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
	});

	it('should sync resource blob changes', async () => {
		const tempFile = tempFilePath('txt');
		await shim.fsDriver().writeFile(tempFile, '1234', 'utf8');
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, tempFile);
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await resourceFetcher().start();
		await resourceFetcher().waitForAllFinished();
		let resource1_2 = (await Resource.all())[0];
		const modFile = tempFilePath('txt');
		await shim.fsDriver().writeFile(modFile, '1234 MOD', 'utf8');
		await Resource.updateResourceBlobContent(resource1_2.id, modFile);
		const originalSize = resource1_2.size;
		resource1_2 = (await Resource.all())[0];
		const newSize = resource1_2.size;
		expect(originalSize).toBe(4);
		expect(newSize).toBe(8);
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();
		await resourceFetcher().start();
		await resourceFetcher().waitForAllFinished();
		const resource1_1 = (await Resource.all())[0];
		expect(resource1_1.size).toBe(newSize);
		expect(await Resource.resourceBlobContent(resource1_1.id, 'utf8')).toBe('1234 MOD');
	});

	it('should handle resource conflicts', async () => {
		{
			const tempFile = tempFilePath('txt');
			await shim.fsDriver().writeFile(tempFile, '1234', 'utf8');
			const folder1 = await Folder.save({ title: 'folder1' });
			const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
			await shim.attachFileToNote(note1, tempFile);
			await synchronizerStart();
		}

		await switchClient(2);

		{
			await synchronizerStart();
			await resourceFetcher().start();
			await resourceFetcher().waitForAllFinished();
			const resource = (await Resource.all())[0];
			const modFile2 = tempFilePath('txt');
			await shim.fsDriver().writeFile(modFile2, '1234 MOD 2', 'utf8');
			await Resource.updateResourceBlobContent(resource.id, modFile2);
			await synchronizerStart();
		}

		await switchClient(1);

		{
			// Going to modify a resource without syncing first, which will cause a conflict
			const resource = (await Resource.all())[0];
			const modFile1 = tempFilePath('txt');
			await shim.fsDriver().writeFile(modFile1, '1234 MOD 1', 'utf8');
			await Resource.updateResourceBlobContent(resource.id, modFile1);
			await synchronizerStart(); // CONFLICT

			// If we try to read the resource content now, it should throw because the local
			// content has been moved to the conflict notebook, and the new local content
			// has not been downloaded yet.
			await checkThrowAsync(async () => await Resource.resourceBlobContent(resource.id));

			// Now download resources, and our local content would have been overwritten by
			// the content from client 2
			await resourceFetcher().start();
			await resourceFetcher().waitForAllFinished();
			const localContent = await Resource.resourceBlobContent(resource.id, 'utf8');
			expect(localContent).toBe('1234 MOD 2');

			// Check that the Conflict note has been generated, with the conflict resource
			// attached to it, and check that it has the original content.
			const allNotes = await Note.all();
			expect(allNotes.length).toBe(2);
			const resourceConflictFolderId = await Resource.resourceConflictFolderId();
			const conflictNote = allNotes.find((v: NoteEntity) => {
				return v.parent_id === resourceConflictFolderId;
			});
			expect(!!conflictNote).toBe(true);
			const resourceIds = await Note.linkedResourceIds(conflictNote.body);
			expect(resourceIds.length).toBe(1);
			const conflictContent = await Resource.resourceBlobContent(resourceIds[0], 'utf8');
			expect(conflictContent).toBe('1234 MOD 1');

			// Also check that the conflict folder has been created and that it
			// is a top folder.
			const resourceConflictFolder = await Folder.load(resourceConflictFolderId);
			expect(resourceConflictFolder).toBeTruthy();
			expect(resourceConflictFolder.parent_id).toBeFalsy();
		}
	});

	it('should handle resource conflicts if a resource is changed locally but deleted remotely', async () => {
		{
			const tempFile = tempFilePath('txt');
			await shim.fsDriver().writeFile(tempFile, '1234', 'utf8');
			const folder1 = await Folder.save({ title: 'folder1' });
			const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
			await shim.attachFileToNote(note1, tempFile);
			await synchronizerStart();
		}

		await switchClient(2);

		{
			await synchronizerStart();
			await resourceFetcher().startAndWait();
		}

		await switchClient(1);

		{
			const resource = (await Resource.all())[0];
			await Resource.delete(resource.id);
			await synchronizerStart();

		}

		await switchClient(2);

		{
			const originalResource = (await Resource.all())[0];
			await Resource.save({ id: originalResource.id, title: 'modified resource' });
			await synchronizerStart(); // CONFLICT

			const deletedResource = await Resource.load(originalResource.id);
			expect(!deletedResource).toBe(true);

			const allResources = await Resource.all();
			expect(allResources.length).toBe(1);
			const conflictResource = allResources[0];
			expect(originalResource.id).not.toBe(conflictResource.id);
			expect(conflictResource.title).toBe('modified resource');
		}
	});

	it('should not upload a resource if it has not been fetched yet', async () => {
		// In some rare cases, the synchronizer might try to upload a resource even though it
		// doesn't have the resource file. It can happen in this situation:
		// - C1 create resource
		// - C1 sync
		// - C2 sync
		// - C2 resource metadata is received but ResourceFetcher hasn't downloaded the file yet
		// - C2 enables E2EE - all the items are marked for forced sync
		// - C2 sync
		// The synchronizer will try to upload the resource, even though it doesn't have the file,
		// so we need to make sure it doesn't. But also that once it gets the file, the resource
		// does get uploaded.

		const note1 = await Note.save({ title: 'note' });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		const resource = (await Resource.all())[0];
		await Resource.setLocalState(resource.id, { fetch_status: Resource.FETCH_STATUS_IDLE });
		await synchronizerStart();

		expect((await remoteResources()).length).toBe(0);

		await Resource.setLocalState(resource.id, { fetch_status: Resource.FETCH_STATUS_DONE });
		await synchronizerStart();

		// At first, the resource is marked as cannot sync, so even after
		// synchronisation, nothing should happen.
		expect((await remoteResources()).length).toBe(0);

		// The user can retry the item, in which case sync should happen.
		await BaseItem.saveSyncEnabled(ModelType.Resource, resource.id);
		await synchronizerStart();
		expect((await remoteResources()).length).toBe(1);
	});

	it('should not download resources over the limit', async () => {
		const note1 = await Note.save({ title: 'note' });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		await synchronizer().start();

		await switchClient(2);

		const previousMax = synchronizer().maxResourceSize_;
		synchronizer().maxResourceSize_ = 1;
		await synchronizerStart();
		synchronizer().maxResourceSize_ = previousMax;

		const syncItems = await BaseItem.allSyncItems(syncTargetId());
		expect(syncItems.length).toBe(2);
		expect(syncItems[1].item_location).toBe(BaseItem.SYNC_ITEM_LOCATION_REMOTE);
		expect(syncItems[1].sync_disabled).toBe(1);
	});

	it('should not upload blob if it has not changed', async () => {
		const note = await Note.save({});
		await shim.attachFileToNote(note, `${supportDir}/sample.txt`);
		const resource: ResourceEntity = (await Resource.all())[0];
		const resourcePath = `.resource/${resource.id}`;

		await synchronizer().api().mkdir('.resource/');
		await synchronizer().api().put(resourcePath, 'before upload');
		expect(await synchronizer().api().get(resourcePath)).toBe('before upload');
		await synchronizerStart();
		expect(await synchronizer().api().get(resourcePath)).toBe('just testing');

		// ----------------------------------------------------------------------
		// Change metadata only and check that blob is not uploaded. To do this,
		// we manually overwrite the data on the sync target, then sync. If the
		// synchronizer doesn't upload the blob, this manually changed data
		// should remain.
		// ----------------------------------------------------------------------

		await Resource.save({ id: resource.id, title: 'my new title' });
		await synchronizer().api().put(resourcePath, 'check if changed');
		await synchronizerStart();
		expect(await synchronizer().api().get(resourcePath)).toBe('check if changed');

		// ----------------------------------------------------------------------
		// Now change the blob, and check that the remote item has been
		// overwritten.
		// ----------------------------------------------------------------------

		await Resource.updateResourceBlobContent(resource.id, `${supportDir}/sample.txt`);
		await synchronizerStart();
		expect(await synchronizer().api().get(resourcePath)).toBe('just testing');

		// ----------------------------------------------------------------------
		// Change the blob, then change the metadata, and sync. Even though
		// blob_updated_time is earlier than updated_time, it should still
		// update everything on the sync target, because both times are after
		// the item sync_time.
		// ----------------------------------------------------------------------

		await Resource.updateResourceBlobContent(resource.id, `${supportDir}/sample2.txt`);
		await msleep(1);
		await Resource.save({ id: resource.id, title: 'my new title 2' });
		await synchronizerStart();
		expect(await synchronizer().api().get(resourcePath)).toBe('just testing 2');
		expect(await synchronizer().api().get(`${resource.id}.md`)).toContain('my new title 2');
	});

});
