import { supportDir, setupDatabaseAndSynchronizer, switchClient, simulateReadOnlyShareEnv, expectThrow, createTempFile, msleep } from '../testing/test-utils';
import Folder from '../models/Folder';
import Note from '../models/Note';
import Resource from '../models/Resource';
import shim from '../shim';
import { ErrorCode } from '../errors';
import { remove, pathExists } from 'fs-extra';
import { ResourceEntity, ResourceOcrStatus } from '../services/database/types';

const testImagePath = `${supportDir}/photo.jpg`;

const setupFolderNoteResourceReadOnly = async (shareId: string) => {
	const cleanup = simulateReadOnlyShareEnv(shareId);

	let folder = await Folder.save({ });
	let note = await Note.save({ parent_id: folder.id });
	await shim.attachFileToNote(note, testImagePath);
	let resource = (await Resource.all())[0];

	folder = await Folder.save({ id: folder.id, share_id: shareId });
	note = await Note.save({ id: note.id, share_id: shareId });
	resource = await Resource.save({ id: resource.id, share_id: shareId });

	resource = await Resource.load(resource.id); // reload to get all properties

	return { cleanup, folder, note, resource };
};

describe('models/Resource', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should have a "done" fetch_status when created locally', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, testImagePath);
		const resource1 = (await Resource.all())[0];
		const ls = await Resource.localState(resource1);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);
	}));

	it('should have a default local state', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, testImagePath);
		const resource1 = (await Resource.all())[0];
		const ls = await Resource.localState(resource1);
		expect(!ls.id).toBe(true);
		expect(ls.resource_id).toBe(resource1.id);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);
	}));

	it('should save and delete local state', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, testImagePath);
		const resource1 = (await Resource.all())[0];
		await Resource.setLocalState(resource1, { fetch_status: Resource.FETCH_STATUS_IDLE });

		let ls = await Resource.localState(resource1);
		expect(!!ls.id).toBe(true);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_IDLE);

		await Resource.delete(resource1.id);
		ls = await Resource.localState(resource1);
		expect(!ls.id).toBe(true);
	}));

	it('should resize the resource if the image is below the required dimensions', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const previousMax = Resource.IMAGE_MAX_DIMENSION;
		Resource.IMAGE_MAX_DIMENSION = 5;
		await shim.attachFileToNote(note1, testImagePath);
		Resource.IMAGE_MAX_DIMENSION = previousMax;
		const resource1 = (await Resource.all())[0];

		const originalStat = await shim.fsDriver().stat(testImagePath);
		const newStat = await shim.fsDriver().stat(Resource.fullPath(resource1));

		expect(newStat.size < originalStat.size).toBe(true);
	}));

	it('should not resize the resource if the image is below the required dimensions', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, testImagePath);
		const resource1 = (await Resource.all())[0];

		const originalStat = await shim.fsDriver().stat(testImagePath);
		const newStat = await shim.fsDriver().stat(Resource.fullPath(resource1));

		expect(originalStat.size).toBe(newStat.size);
	}));

	it('should set the blob_updated_time property if the blob is updated', (async () => {
		const note = await Note.save({});
		await shim.attachFileToNote(note, testImagePath);

		const resourceA: ResourceEntity = (await Resource.all())[0];
		expect(resourceA.updated_time).toBe(resourceA.blob_updated_time);

		await msleep(1);

		await Resource.updateResourceBlobContent(resourceA.id, testImagePath);

		const resourceB: ResourceEntity = (await Resource.all())[0];
		expect(resourceB.updated_time).toBeGreaterThan(resourceA.updated_time);
		expect(resourceB.blob_updated_time).toBeGreaterThan(resourceA.blob_updated_time);
	}));

	it('should NOT set the blob_updated_time property if the blob is NOT updated', (async () => {
		const note = await Note.save({});
		await shim.attachFileToNote(note, testImagePath);

		const resourceA: ResourceEntity = (await Resource.all())[0];

		await msleep(1);

		// We only update the resource metadata - so the blob timestamp should
		// not change
		await Resource.save({ id: resourceA.id, title: 'new title' });

		const resourceB: ResourceEntity = (await Resource.all())[0];
		expect(resourceB.updated_time).toBeGreaterThan(resourceA.updated_time);
		expect(resourceB.blob_updated_time).toBe(resourceA.blob_updated_time);
	}));

	it('should not allow modifying a read-only resource', async () => {
		const { cleanup, resource } = await setupFolderNoteResourceReadOnly('123456789');
		await expectThrow(async () => Resource.save({ id: resource.id, share_id: '123456789', title: 'cannot do this!' }), ErrorCode.IsReadOnly);
		cleanup();
	});

	it('should not allow modifying a read-only resource content', async () => {
		const { cleanup, resource } = await setupFolderNoteResourceReadOnly('123456789');
		const tempFilePath = await createTempFile('something');
		await expectThrow(async () => Resource.updateResourceBlobContent(resource.id, tempFilePath), ErrorCode.IsReadOnly);
		await remove(tempFilePath);
		cleanup();
	});

	it('should not allow deleting a read-only resource', async () => {
		const { cleanup, resource } = await setupFolderNoteResourceReadOnly('123456789');
		expect(await pathExists(Resource.fullPath(resource))).toBe(true);
		await expectThrow(async () => Resource.delete(resource.id), ErrorCode.IsReadOnly);
		// Also check that the resource blob has not been deleted
		expect(await pathExists(Resource.fullPath(resource))).toBe(true);
		cleanup();
	});

	it('should return resources since a certain time and ID', async () => {
		expect((await Resource.allForNormalization(0, '')).length).toBe(0);

		const testData: [string, number][] = [
			['00000000000000000000000000000001', 1536700000000],
			['ddddddddddddddddddddddddddddddd1', 1536700000001],
			['ddddddddddddddddddddddddddddddd3', 1536700000001],
			['ddddddddddddddddddddddddddddddd2', 1536700000001],
			['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1', 1536700000002],
		];

		for (const [id, updatedTime] of testData) {
			await Resource.save({
				id,
				created_time: updatedTime,
				updated_time: updatedTime,
				user_updated_time: updatedTime,
				user_created_time: updatedTime,
				mime: 'application/octet-stream',
				ocr_text: 'test',
				ocr_status: ResourceOcrStatus.Done,
			}, { isNew: true, autoTimestamp: false });
		}

		expect((await Resource.allForNormalization(0, '')).length).toBe(testData.length);

		{
			const resources = await Resource.allForNormalization(1536700000001, 'ddddddddddddddddddddddddddddddd2');
			expect(resources.length).toBe(2);
			expect(resources.map(r => r.id)).toEqual(['ddddddddddddddddddddddddddddddd3', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1']);
		}

		{
			const resources = await Resource.allForNormalization(1536700000000, '00000000000000000000000000000001');
			expect(resources.length).toBe(4);
			expect(resources.map(r => r.id)).toEqual(['ddddddddddddddddddddddddddddddd1', 'ddddddddddddddddddddddddddddddd2', 'ddddddddddddddddddddddddddddddd3', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1']);
		}
	});

});
