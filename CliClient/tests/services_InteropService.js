/* eslint-disable no-unused-vars */

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

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function exportDir() {
	return `${__dirname}/export`;
}

function fieldsEqual(model1, model2, fieldNames) {
	for (let i = 0; i < fieldNames.length; i++) {
		const f = fieldNames[i];
		expect(model1[f]).toBe(model2[f], `For key ${f}`);
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
		let folder1 = await Folder.save({ title: 'folder1' });
		folder1 = await Folder.load(folder1.id);
		const filePath = `${exportDir()}/test.jex`;

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
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		const filePath = `${exportDir()}/test.jex`;

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
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		const filePath = `${exportDir()}/test.jex`;

		await service.export({ path: filePath });

		await Note.delete(note1.id);

		await service.import({ path: filePath, destinationFolderId: folder1.id });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(1);

		expect(await checkThrowAsync(async () => await service.import({ path: filePath, destinationFolderId: 'oops' }))).toBe(true);
	}));

	it('should export and import tags', asyncTest(async () => {
		const service = new InteropService();
		const filePath = `${exportDir()}/test.jex`;
		let folder1 = await Folder.save({ title: 'folder1' });
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
		const filePath = `${exportDir()}/test.jex`;
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		note1 = await Note.load(note1.id);
		let resourceIds = await Note.linkedResourceIds(note1.body);
		let resource1 = await Resource.load(resourceIds[0]);

		await service.export({ path: filePath });

		await Note.delete(note1.id);

		await service.import({ path: filePath });

		expect(await Resource.count()).toBe(2);

		let note2 = (await Note.all())[0];
		expect(note2.body).not.toBe(note1.body);
		resourceIds = await Note.linkedResourceIds(note2.body);
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
		const filePath = `${exportDir()}/test.jex`;
		let folder1 = await Folder.save({ title: 'folder1' });
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
		const filePath = `${exportDir()}/test.jex`;
		let folder1 = await Folder.save({ title: 'folder1' });
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

	it('should export and import folder and its sub-folders', asyncTest(async () => {

		const service = new InteropService();
		const filePath = `${exportDir()}/test.jex`;
		let folder1 = await Folder.save({ title: 'folder1' });
		let folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		let folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		let folder4 = await Folder.save({ title: 'folder4', parent_id: folder2.id });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder4.id });

		await service.export({ path: filePath, sourceFolderIds: [folder1.id] });

		await Note.delete(note1.id);
		await Folder.delete(folder1.id);
		await Folder.delete(folder2.id);
		await Folder.delete(folder3.id);
		await Folder.delete(folder4.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(4);

		let folder1_2 = await Folder.loadByTitle('folder1');
		let folder2_2 = await Folder.loadByTitle('folder2');
		let folder3_2 = await Folder.loadByTitle('folder3');
		let folder4_2 = await Folder.loadByTitle('folder4');
		let note1_2 = await Note.loadByTitle('ma note');

		expect(folder2_2.parent_id).toBe(folder1_2.id);
		expect(folder3_2.parent_id).toBe(folder2_2.id);
		expect(folder4_2.parent_id).toBe(folder2_2.id);
		expect(note1_2.parent_id).toBe(folder4_2.id);
	}));

	it('should export and import links to notes', asyncTest(async () => {
		const service = new InteropService();
		const filePath = `${exportDir()}/test.jex`;
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'ma deuxième note', body: `Lien vers première note : ${Note.markdownTag(note1)}`, parent_id: folder1.id });

		await service.export({ path: filePath, sourceFolderIds: [folder1.id] });

		await Note.delete(note1.id);
		await Note.delete(note2.id);
		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(2);
		expect(await Folder.count()).toBe(1);

		let note1_2 = await Note.loadByTitle('ma note');
		let note2_2 = await Note.loadByTitle('ma deuxième note');

		expect(note2_2.body.indexOf(note1_2.id) >= 0).toBe(true);
	}));

	it('should export into json format', asyncTest(async () => {
		const service = new InteropService();
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		const filePath = exportDir();

		await service.export({ path: filePath, format: 'json' });

		// verify that the json files exist and can be parsed
		const items = [folder1, note1];
		for (let i = 0; i < items.length; i++) {
			const jsonFile = `${filePath}/${items[i].id}.json`;
			let json = await fs.readFile(jsonFile, 'utf-8');
			let obj = JSON.parse(json);
			expect(obj.id).toBe(items[i].id);
			expect(obj.type_).toBe(items[i].type_);
			expect(obj.title).toBe(items[i].title);
			expect(obj.body).toBe(items[i].body);
		}
	}));

	it('should export selected notes in md format', asyncTest(async () => {
		const service = new InteropService();
		let folder1 = await Folder.save({ title: 'folder1' });
		let note11 = await Note.save({ title: 'title note11', parent_id: folder1.id });
		note11 = await Note.load(note11.id);
		let note12 = await Note.save({ title: 'title note12', parent_id: folder1.id });
		note12 = await Note.load(note12.id);

		let folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		folder2 = await Folder.load(folder2.id);
		let note21 = await Note.save({ title: 'title note21', parent_id: folder2.id });
		note21 = await Note.load(note21.id);

		let folder3 = await Folder.save({ title: 'folder3', parent_id: folder1.id });
		folder3 = await Folder.load(folder2.id);

		const outDir = exportDir();

		await service.export({ path: outDir, format: 'md', sourceNoteIds: [note11.id, note21.id] });

		// verify that the md files exist
		expect(await shim.fsDriver().exists(`${outDir}/folder1`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/title note11.md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/title note12.md`)).toBe(false);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/folder2`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/folder2/title note21.md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder3`)).toBe(false);
	}));

	it('should export MD with unicode filenames', asyncTest(async () => {
		const service = new InteropService();
		let folder1 = await Folder.save({ title: 'folder1' });
		let folder2 = await Folder.save({ title: 'ジョプリン' });
		let note1 = await Note.save({ title: '生活', parent_id: folder1.id });
		let note2 = await Note.save({ title: '生活', parent_id: folder1.id });
		let note2b = await Note.save({ title: '生活', parent_id: folder1.id });
		let note3 = await Note.save({ title: '', parent_id: folder1.id });
		let note4 = await Note.save({ title: '', parent_id: folder1.id });
		let note5 = await Note.save({ title: 'salut, ça roule ?', parent_id: folder1.id });
		let note6 = await Note.save({ title: 'ジョプリン', parent_id: folder2.id });

		const outDir = exportDir();

		await service.export({ path: outDir, format: 'md' });

		expect(await shim.fsDriver().exists(`${outDir}/folder1/生活.md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/生活 (1).md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/生活 (2).md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/Untitled.md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/Untitled (1).md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/folder1/salut, ça roule _.md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${outDir}/ジョプリン/ジョプリン.md`)).toBe(true);
	}));

});
