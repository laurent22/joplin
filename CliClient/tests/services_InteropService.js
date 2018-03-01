require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const InteropService = require('lib/services/InteropService.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const Resource = require('lib/models/Resource.js');
const fs = require('fs-extra');
const ArrayUtils = require('lib/ArrayUtils');
const ObjectUtils = require('lib/ObjectUtils');
const { shim } = require('lib/shim.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function exportDir() {
	return __dirname + '/export';
}

function fieldsEqual(model1, model2, fieldNames) {
	for (let i = 0; i < fieldNames.length; i++) {
		const f = fieldNames[i];
		expect(model1[f]).toBe(model2[f], 'For key ' + f);
	}
}

describe('services_InteropService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		const dir = exportDir();
		await fs.remove(dir);
		await fs.mkdirp(dir);
		done();
	});

	it('should export and import folders', asyncTest(async () => {
		const service = new InteropService();
		let folder1 = await Folder.save({ title: "folder1" });
		folder1 = await Folder.load(folder1.id);
		const filePath = exportDir() + '/test.jex';

		await service.export({ path: filePath });

		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		// Check that a new folder, with a new ID, has been created

		expect(await Folder.count()).toBe(1);
		let folder2 = (await Folder.all())[0];
		expect(folder2.id).not.toBe(folder1.id);
		expect(folder2.title).toBe(folder1.title);

		await service.import({ path: filePath });

		// As there was already a folder with the same title, check that the new one has been renamed

		await Folder.delete(folder2.id);
		let folder3 = (await Folder.all())[0];
		expect(await Folder.count()).toBe(1);
		expect(folder3.title).not.toBe(folder2.title);

		let fieldNames = Folder.fieldNames();
		fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
		fieldNames = ArrayUtils.removeElement(fieldNames, 'title');

		fieldsEqual(folder3, folder1, fieldNames);
	}));

	it('should export and import folders and notes', asyncTest(async () => {
		const service = new InteropService();
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		const filePath = exportDir() + '/test.jex';

		await service.export({ path: filePath });

		await Folder.delete(folder1.id);
		await Note.delete(note1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		let note2 = (await Note.all())[0];
		let folder2 = (await Folder.all())[0];

		expect(note1.parent_id).not.toBe(note2.parent_id);
		expect(note1.id).not.toBe(note2.id);
		expect(note2.parent_id).toBe(folder2.id);

		let fieldNames = Note.fieldNames();
		fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
		fieldNames = ArrayUtils.removeElement(fieldNames, 'parent_id');

		fieldsEqual(note1, note2, fieldNames);

		await service.import({ path: filePath });

		note2 = (await Note.all())[0];
		let note3 = (await Note.all())[1];

		expect(note2.id).not.toBe(note3.id);
		expect(note2.parent_id).not.toBe(note3.parent_id);

		fieldsEqual(note2, note3, fieldNames);
	}));

	it('should export and import notes to specific folder', asyncTest(async () => {
		const service = new InteropService();
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		const filePath = exportDir() + '/test.jex';

		await service.export({ path: filePath });

		await Note.delete(note1.id);

		await service.import({ path: filePath, destinationFolderId: folder1.id });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(1);

		expect(await checkThrowAsync(async () => await service.import({ path: filePath, destinationFolderId: 'oops' }))).toBe(true);
	}));

	it('should export and import tags', asyncTest(async () => {
		const service = new InteropService();
		const filePath = exportDir() + '/test.jex';
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		let tag1 = await Tag.save({ title: 'mon tag' });
		tag1 = await Tag.load(tag1.id);
		await Tag.addNote(tag1.id, note1.id);

		await service.export({ path: filePath });

		await Folder.delete(folder1.id);
		await Note.delete(note1.id);
		await Tag.delete(tag1.id);

		await service.import({ path: filePath });

		expect(await Tag.count()).toBe(1);
		let tag2 = (await Tag.all())[0];
		let note2 = (await Note.all())[0];
		expect(tag1.id).not.toBe(tag2.id);

		let fieldNames = Note.fieldNames();
		fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
		fieldsEqual(tag1, tag2, fieldNames);

		let noteIds = await Tag.noteIds(tag2.id);
		expect(noteIds.length).toBe(1);
		expect(noteIds[0]).toBe(note2.id);

		await service.import({ path: filePath });

		// If importing again, no new tag should be created as one with
		// the same name already existed. The newly imported note should
		// however go under that already existing tag.
		expect(await Tag.count()).toBe(1);
		noteIds = await Tag.noteIds(tag2.id);
		expect(noteIds.length).toBe(2);
	}));

	it('should export and import resources', asyncTest(async () => {
		const service = new InteropService();
		const filePath = exportDir() + '/test.jex';
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		note1 = await Note.load(note1.id);
		let resourceIds = Note.linkedResourceIds(note1.body);
		let resource1 = await Resource.load(resourceIds[0]);

		await service.export({ path: filePath });
		
		await Note.delete(note1.id);

		await service.import({ path: filePath });

		expect(await Resource.count()).toBe(2);

		let note2 = (await Note.all())[0];
		expect(note2.body).not.toBe(note1.body);
		resourceIds = Note.linkedResourceIds(note2.body);
		expect(resourceIds.length).toBe(1);
		let resource2 = await Resource.load(resourceIds[0]);
		expect(resource2.id).not.toBe(resource1.id);

		let fieldNames = Note.fieldNames();
		fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
		fieldsEqual(resource1, resource2, fieldNames);

		const resourcePath1 = Resource.fullPath(resource1);
		const resourcePath2 = Resource.fullPath(resource2);

		expect(resourcePath1).not.toBe(resourcePath2);
		expect(fileContentEqual(resourcePath1, resourcePath2)).toBe(true);
	}));

	it('should export and import single notes', asyncTest(async () => {
		const service = new InteropService();
		const filePath = exportDir() + '/test.jex';
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await service.export({ path: filePath, sourceNoteIds: [note1.id] });
		
		await Note.delete(note1.id);
		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(1);

		let folder2 = (await Folder.all())[0];
		expect(folder2.title).toBe('test');
	}));

	it('should export and import single folders', asyncTest(async () => {
		const service = new InteropService();
		const filePath = exportDir() + '/test.jex';
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await service.export({ path: filePath, sourceFolderIds: [folder1.id] });
		
		await Note.delete(note1.id);
		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(1);

		let folder2 = (await Folder.all())[0];
		expect(folder2.title).toBe('folder1');
	}));

});