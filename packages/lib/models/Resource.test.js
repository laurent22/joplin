const { supportDir, setupDatabaseAndSynchronizer, switchClient } = require('../testing/test-utils.js');
const Folder = require('../models/Folder').default;
const Note = require('../models/Note').default;
const Resource = require('../models/Resource').default;
const shim = require('../shim').default;

const testImagePath = `${supportDir}/photo.jpg`;

describe('models/Resource', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
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

});
