/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const fs = require('fs-extra');
const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');
const InteropService_Exporter_Md = require('lib/services/InteropService_Exporter_Md.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Resource = require('lib/models/Resource.js');
const Note = require('lib/models/Note.js');
const { shim } = require('lib/shim.js');

const exportDir = `${__dirname}/export`;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('services_InteropService_Exporter_Md', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		await fs.remove(exportDir);
		await fs.mkdirp(exportDir);
		done();
	});

	it('should create resources directory', asyncTest(async () => {
		const service = new InteropService_Exporter_Md();
		await service.init(exportDir);

		expect(await shim.fsDriver().exists(`${exportDir}/_resources/`)).toBe(true);
	}));

	it('should create note paths and add them to context', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note1.body))[0]);

		const folder2 = await Folder.save({ title: 'folder2' });
		let note3 = await Note.save({ title: 'note3', parent_id: folder2.id });
		await shim.attachFileToNote(note3, `${__dirname}/../tests/support/photo.jpg`);
		note3 = await Note.load(note3.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note3);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note3.body))[0]);

		expect(!exporter.context() && !(exporter.context().notePaths || Object.keys(exporter.context().notePaths).length)).toBe(false, 'Context should be empty before processing.');

		await exporter.processItem(Folder, folder1);
		await exporter.processItem(Folder, folder2);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		expect(Object.keys(exporter.context().notePaths).length).toBe(3, 'There should be 3 note paths in the context.');
		expect(exporter.context().notePaths[note1.id]).toBe('folder1/note1.md');
		expect(exporter.context().notePaths[note2.id]).toBe('folder1/note2.md');
		expect(exporter.context().notePaths[note3.id]).toBe('folder2/note3.md');
	}));

	it('should handle duplicate note names', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note1_2 = await Note.save({ title: 'note1', parent_id: folder1.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_NOTE, note1_2);

		await exporter.processItem(Folder, folder1);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		expect(Object.keys(exporter.context().notePaths).length).toBe(2, 'There should be 2 note paths in the context.');
		expect(exporter.context().notePaths[note1.id]).toBe('folder1/note1.md');
		expect(exporter.context().notePaths[note1_2.id]).toBe('folder1/note1 (1).md');
	}));

	it('should not override existing files', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);

		await exporter.processItem(Folder, folder1);
		// Create a file with the path of note1 before processing note1
		await shim.fsDriver().writeFile(`${exportDir}/folder1/note1.md`, 'Note content', 'utf-8');

		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		expect(Object.keys(exporter.context().notePaths).length).toBe(1, 'There should be 1 note paths in the context.');
		expect(exporter.context().notePaths[note1.id]).toBe('folder1/note1 (1).md');
	}));

	it('should save resource files in _resource directory', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note1.body))[0]);
		const resource1 = await Resource.load(itemsToExport[2].itemOrId);

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await shim.attachFileToNote(note2, `${__dirname}/../tests/support/photo.jpg`);
		note2 = await Note.load(note2.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note2.body))[0]);
		const resource2 = await Resource.load(itemsToExport[5].itemOrId);

		await exporter.processResource(resource1, Resource.fullPath(resource1));
		await exporter.processResource(resource2, Resource.fullPath(resource2));

		expect(await shim.fsDriver().exists(`${exportDir}/_resources/${Resource.filename(resource1)}`)).toBe(true, 'Resource file should be copied to _resources directory.');
		expect(await shim.fsDriver().exists(`${exportDir}/_resources/${Resource.filename(resource2)}`)).toBe(true, 'Resource file should be copied to _resources directory.');
	}));

	it('should create folders in fs', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		queueExportItem(BaseModel.TYPE_NOTE, note2);

		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder1.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder3.id);

		await exporter.processItem(Folder, folder2);
		await exporter.processItem(Folder, folder3);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note, note2);

		expect(await shim.fsDriver().exists(`${exportDir}/folder1`)).toBe(true, 'Folder should be created in filesystem.');
		expect(await shim.fsDriver().exists(`${exportDir}/folder1/folder2`)).toBe(true, 'Folder should be created in filesystem.');
		expect(await shim.fsDriver().exists(`${exportDir}/folder1/folder3`)).toBe(true, 'Folder should be created in filesystem.');
	}));

	it('should save notes in fs', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note2);

		const folder3 = await Folder.save({ title: 'folder3' });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder3.id);
		queueExportItem(BaseModel.TYPE_NOTE, note3);

		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note, note1);
		await exporter.processItem(Note, note2);
		await exporter.processItem(Note, note3);

		expect(await shim.fsDriver().exists(`${exportDir}/${exporter.context().notePaths[note1.id]}`)).toBe(true, 'File should be saved in filesystem.');
		expect(await shim.fsDriver().exists(`${exportDir}/${exporter.context().notePaths[note2.id]}`)).toBe(true, 'File should be saved in filesystem.');
		expect(await shim.fsDriver().exists(`${exportDir}/${exporter.context().notePaths[note3.id]}`)).toBe(true, 'File should be saved in filesystem.');
	}));

	it('should replace resource ids with relative paths', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		const resource1 = await Resource.load((await Note.linkedResourceIds(note1.body))[0]);

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await shim.attachFileToNote(note2, `${__dirname}/../tests/support/photo.jpg`);
		note2 = await Note.load(note2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		const resource2 = await Resource.load((await Note.linkedResourceIds(note2.body))[0]);

		await exporter.processItem(Folder, folder1);
		await exporter.processItem(Folder, folder2);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		const context = {
			resourcePaths: {},
		};
		context.resourcePaths[resource1.id] = 'resource1.jpg';
		context.resourcePaths[resource2.id] = 'resource2.jpg';
		exporter.updateContext(context);
		await exporter.processItem(Note, note1);
		await exporter.processItem(Note, note2);

		const note1_body = await shim.fsDriver().readFile(`${exportDir}/${exporter.context().notePaths[note1.id]}`);
		const note2_body = await shim.fsDriver().readFile(`${exportDir}/${exporter.context().notePaths[note2.id]}`);

		expect(note1_body).toContain('](../_resources/resource1.jpg)', 'Resource id should be replaced with a relative path.');
		expect(note2_body).toContain('](../../_resources/resource2.jpg)', 'Resource id should be replaced with a relative path.');
	}));

	it('should replace note ids with relative paths', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const changeNoteBodyAndReload = async (note, newBody) => {
			note.body = newBody;
			await Note.save(note);
			return await Note.load(note.id);
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'note2', parent_id: folder2.id });

		const folder3 = await Folder.save({ title: 'folder3' });
		let note3 = await Note.save({ title: 'note3', parent_id: folder3.id });

		note1 = await changeNoteBodyAndReload(note1, `# Some text \n\n [A link to note3](:/${note3.id})`);
		note2 = await changeNoteBodyAndReload(note2, `# Some text \n\n [A link to note3](:/${note3.id}) some more text \n ## And some headers \n and [A link to note1](:/${note1.id}) more links`);
		note3 = await changeNoteBodyAndReload(note3, `[A link to note3](:/${note2.id})`);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		queueExportItem(BaseModel.TYPE_NOTE, note3);

		await exporter.processItem(Folder, folder1);
		await exporter.processItem(Folder, folder2);
		await exporter.processItem(Folder, folder3);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note, note1);
		await exporter.processItem(Note, note2);
		await exporter.processItem(Note, note3);

		const note1_body = await shim.fsDriver().readFile(`${exportDir}/${exporter.context().notePaths[note1.id]}`);
		const note2_body = await shim.fsDriver().readFile(`${exportDir}/${exporter.context().notePaths[note2.id]}`);
		const note3_body = await shim.fsDriver().readFile(`${exportDir}/${exporter.context().notePaths[note3.id]}`);

		expect(note1_body).toContain('](../folder3/note3.md)', 'Note id should be replaced with a relative path.');
		expect(note2_body).toContain('](../../folder3/note3.md)', 'Resource id should be replaced with a relative path.');
		expect(note2_body).toContain('](../../folder1/note1.md)', 'Resource id should be replaced with a relative path.');
		expect(note3_body).toContain('](../folder1/folder2/note2.md)', 'Resource id should be replaced with a relative path.');
	}));

	it('should url encode relative note links', asyncTest(async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir);

		const itemsToExport = [];
		const queueExportItem = (itemType, itemOrId) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder with space1' });
		const note1 = await Note.save({ title: 'note1 name with space', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id, body: `[link](:/${note1.id})` });
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_NOTE, note2);

		await exporter.processItem(Folder, folder1);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note, note1);
		await exporter.processItem(Note, note2);

		const note2_body = await shim.fsDriver().readFile(`${exportDir}/${exporter.context().notePaths[note2.id]}`);
		expect(note2_body).toContain('[link](../folder%20with%20space1/note1%20name%20with%20space.md)', 'Whitespace in URL should be encoded');
	}));
});
