require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const InteropService = require('lib/services/InteropService.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const Resource = require('lib/models/Resource.js');
const NoteResource = require('lib/models/NoteResource.js');
const ResourceService = require('lib/services/ResourceService.js');
const fs = require('fs-extra');
const ArrayUtils = require('lib/ArrayUtils');
const ObjectUtils = require('lib/ObjectUtils');
const { shim } = require('lib/shim.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

function exportDir() {
	return __dirname + '/export';
}

function fieldsEqual(model1, model2, fieldNames) {
	for (let i = 0; i < fieldNames.length; i++) {
		const f = fieldNames[i];
		expect(model1[f]).toBe(model2[f], 'For key ' + f);
	}
}

describe('services_ResourceService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should delete orphaned resources', asyncTest(async () => {
		const service = new ResourceService();

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		let resource1 = (await Resource.all())[0];
		const resourcePath = Resource.fullPath(resource1);

		await service.indexNoteResources();
		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);

		await Note.delete(note1.id);
		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);

		await service.indexNoteResources();
		await service.deleteOrphanResources(1000 * 60);

		expect(!!(await Resource.load(resource1.id))).toBe(true);

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(false);
		expect(await shim.fsDriver().exists(resourcePath)).toBe(false);
		expect(!(await NoteResource.all()).length).toBe(true);
	}));

	it('should not delete resource if still associated with at least one note', asyncTest(async () => {
		const service = new ResourceService();

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'ma deuxième note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		let resource1 = (await Resource.all())[0];
		const resourcePath = Resource.fullPath(resource1);

		await service.indexNoteResources();

		await Note.delete(note1.id);
		
		await service.indexNoteResources();
		
		await Note.save({ id: note2.id, body: Resource.markdownTag(resource1) });

		await service.indexNoteResources();

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);
	}));

	it('should not delete a resource that has never been associated with any note, because it probably means the resource came via sync, and associated note has not arrived yet', asyncTest(async () => {
		const service = new ResourceService();
		const resource = await shim.createResourceFromPath(__dirname + '/../tests/support/photo.jpg');

		await service.indexNoteResources();
		await service.deleteOrphanResources(0);

		expect((await Resource.all()).length).toBe(1);
	}));

});