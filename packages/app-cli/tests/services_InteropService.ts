import InteropService from '@joplin/lib/services/interop/InteropService';
import { CustomExportContext, CustomImportContext, Module, ModuleType } from '@joplin/lib/services/interop/types';
import shim from '@joplin/lib/shim';


const { asyncTest, fileContentEqual, setupDatabaseAndSynchronizer, switchClient, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const Tag = require('@joplin/lib/models/Tag.js');
const Resource = require('@joplin/lib/models/Resource.js');
const fs = require('fs-extra');
const ArrayUtils = require('@joplin/lib/ArrayUtils');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at services_InteropService: Promise', p, 'reason:', reason);
});

function exportDir() {
	return `${__dirname}/export`;
}

function fieldsEqual(model1: any, model2: any, fieldNames: string[]) {
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
		const service = InteropService.instance();
		let folder1 = await Folder.save({ title: 'folder1' });
		folder1 = await Folder.load(folder1.id);
		const filePath = `${exportDir()}/test.jex`;

		await service.export({ path: filePath });

		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		// Check that a new folder, with a new ID, has been created

		expect(await Folder.count()).toBe(1);
		const folder2 = (await Folder.all())[0];
		expect(folder2.id).not.toBe(folder1.id);
		expect(folder2.title).toBe(folder1.title);

		await service.import({ path: filePath });

		// As there was already a folder with the same title, check that the new one has been renamed

		await Folder.delete(folder2.id);
		const folder3 = (await Folder.all())[0];
		expect(await Folder.count()).toBe(1);
		expect(folder3.title).not.toBe(folder2.title);

		let fieldNames = Folder.fieldNames();
		fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
		fieldNames = ArrayUtils.removeElement(fieldNames, 'title');

		fieldsEqual(folder3, folder1, fieldNames);
	}));

	it('should import folders and de-duplicate titles when needed', asyncTest(async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder' });
		const folder2 = await Folder.save({ title: 'folder' });
		const filePath = `${exportDir()}/test.jex`;
		await service.export({ path: filePath });

		await Folder.delete(folder1.id);
		await Folder.delete(folder2.id);

		await service.import({ path: filePath });

		const allFolders = await Folder.all();
		expect(allFolders.map((f: any) => f.title).sort().join(' - ')).toBe('folder - folder (1)');
	}));

	it('should import folders, and only de-duplicate titles when needed', asyncTest(async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		await Folder.save({ title: 'Sub', parent_id: folder1.id });
		await Folder.save({ title: 'Sub', parent_id: folder2.id });
		const filePath = `${exportDir()}/test.jex`;
		await service.export({ path: filePath });

		await Folder.delete(folder1.id);
		await Folder.delete(folder2.id);

		await service.import({ path: filePath });

		const importedFolder1 = await Folder.loadByTitle('folder1');
		const importedFolder2 = await Folder.loadByTitle('folder2');
		const importedSub1 = await Folder.load((await Folder.childrenIds(importedFolder1.id))[0]);
		const importedSub2 = await Folder.load((await Folder.childrenIds(importedFolder2.id))[0]);

		expect(importedSub1.title).toBe('Sub');
		expect(importedSub2.title).toBe('Sub');
	}));

	it('should export and import folders and notes', asyncTest(async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		const filePath = `${exportDir()}/test.jex`;

		await service.export({ path: filePath });

		await Folder.delete(folder1.id);
		await Note.delete(note1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		let note2 = (await Note.all())[0];
		const folder2 = (await Folder.all())[0];

		expect(note1.parent_id).not.toBe(note2.parent_id);
		expect(note1.id).not.toBe(note2.id);
		expect(note2.parent_id).toBe(folder2.id);

		let fieldNames = Note.fieldNames();
		fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
		fieldNames = ArrayUtils.removeElement(fieldNames, 'parent_id');

		fieldsEqual(note1, note2, fieldNames);

		await service.import({ path: filePath });

		note2 = (await Note.all())[0];
		const note3 = (await Note.all())[1];

		expect(note2.id).not.toBe(note3.id);
		expect(note2.parent_id).not.toBe(note3.parent_id);

		fieldsEqual(note2, note3, fieldNames);
	}));

	it('should export and import notes to specific folder', asyncTest(async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
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
		const service = InteropService.instance();
		const filePath = `${exportDir()}/test.jex`;
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		let tag1 = await Tag.save({ title: 'mon tag' });
		tag1 = await Tag.load(tag1.id);
		await Tag.addNote(tag1.id, note1.id);

		await service.export({ path: filePath });

		await Folder.delete(folder1.id);
		await Note.delete(note1.id);
		await Tag.delete(tag1.id);

		await service.import({ path: filePath });

		expect(await Tag.count()).toBe(1);
		const tag2 = (await Tag.all())[0];
		const note2 = (await Note.all())[0];
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
		const service = InteropService.instance();
		const filePath = `${exportDir()}/test.jex`;
		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		note1 = await Note.load(note1.id);
		let resourceIds = await Note.linkedResourceIds(note1.body);
		const resource1 = await Resource.load(resourceIds[0]);

		await service.export({ path: filePath });

		await Note.delete(note1.id);

		await service.import({ path: filePath });

		expect(await Resource.count()).toBe(2);

		const note2 = (await Note.all())[0];
		expect(note2.body).not.toBe(note1.body);
		resourceIds = await Note.linkedResourceIds(note2.body);
		expect(resourceIds.length).toBe(1);
		const resource2 = await Resource.load(resourceIds[0]);
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
		const service = InteropService.instance();
		const filePath = `${exportDir()}/test.jex`;
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await service.export({ path: filePath, sourceNoteIds: [note1.id] });

		await Note.delete(note1.id);
		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(1);

		const folder2 = (await Folder.all())[0];
		expect(folder2.title).toBe('test');
	}));

	it('should export and import single folders', asyncTest(async () => {
		const service = InteropService.instance();
		const filePath = `${exportDir()}/test.jex`;
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await service.export({ path: filePath, sourceFolderIds: [folder1.id] });

		await Note.delete(note1.id);
		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(1);

		const folder2 = (await Folder.all())[0];
		expect(folder2.title).toBe('folder1');
	}));

	it('should export and import folder and its sub-folders', asyncTest(async () => {

		const service = InteropService.instance();
		const filePath = `${exportDir()}/test.jex`;
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const folder4 = await Folder.save({ title: 'folder4', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder4.id });

		await service.export({ path: filePath, sourceFolderIds: [folder1.id] });

		await Note.delete(note1.id);
		await Folder.delete(folder1.id);
		await Folder.delete(folder2.id);
		await Folder.delete(folder3.id);
		await Folder.delete(folder4.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(1);
		expect(await Folder.count()).toBe(4);

		const folder1_2 = await Folder.loadByTitle('folder1');
		const folder2_2 = await Folder.loadByTitle('folder2');
		const folder3_2 = await Folder.loadByTitle('folder3');
		const folder4_2 = await Folder.loadByTitle('folder4');
		const note1_2 = await Note.loadByTitle('ma note');

		expect(folder2_2.parent_id).toBe(folder1_2.id);
		expect(folder3_2.parent_id).toBe(folder2_2.id);
		expect(folder4_2.parent_id).toBe(folder2_2.id);
		expect(note1_2.parent_id).toBe(folder4_2.id);
	}));

	it('should export and import links to notes', asyncTest(async () => {
		const service = InteropService.instance();
		const filePath = `${exportDir()}/test.jex`;
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma deuxième note', body: `Lien vers première note : ${Note.markdownTag(note1)}`, parent_id: folder1.id });

		await service.export({ path: filePath, sourceFolderIds: [folder1.id] });

		await Note.delete(note1.id);
		await Note.delete(note2.id);
		await Folder.delete(folder1.id);

		await service.import({ path: filePath });

		expect(await Note.count()).toBe(2);
		expect(await Folder.count()).toBe(1);

		const note1_2 = await Note.loadByTitle('ma note');
		const note2_2 = await Note.loadByTitle('ma deuxième note');

		expect(note2_2.body.indexOf(note1_2.id) >= 0).toBe(true);
	}));

	it('should export selected notes in md format', asyncTest(async () => {
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		let note11 = await Note.save({ title: 'title note11', parent_id: folder1.id });
		note11 = await Note.load(note11.id);
		const note12 = await Note.save({ title: 'title note12', parent_id: folder1.id });
		await Note.load(note12.id);

		let folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		folder2 = await Folder.load(folder2.id);
		let note21 = await Note.save({ title: 'title note21', parent_id: folder2.id });
		note21 = await Note.load(note21.id);

		await Folder.save({ title: 'folder3', parent_id: folder1.id });
		await Folder.load(folder2.id);

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
		const service = InteropService.instance();
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'ジョプリン' });
		await Note.save({ title: '生活', parent_id: folder1.id });
		await Note.save({ title: '生活', parent_id: folder1.id });
		await Note.save({ title: '生活', parent_id: folder1.id });
		await Note.save({ title: '', parent_id: folder1.id });
		await Note.save({ title: '', parent_id: folder1.id });
		await Note.save({ title: 'salut, ça roule ?', parent_id: folder1.id });
		await Note.save({ title: 'ジョプリン', parent_id: folder2.id });

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

	it('should export a notebook as MD', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'testexportfolder' });
		await Note.save({ title: 'textexportnote1', parent_id: folder1.id });
		await Note.save({ title: 'textexportnote2', parent_id: folder1.id });

		const service = InteropService.instance();

		await service.export({
			path: exportDir(),
			format: 'md',
			sourceFolderIds: [folder1.id],
		});

		expect(await shim.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote1.md`)).toBe(true);
		expect(await shim.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote2.md`)).toBe(true);
	}));

	it('should not try to export folders with a non-existing parent', asyncTest(async () => {
		// Handles and edge case where user has a folder but this folder with a parent
		// that doesn't exist. Can happen for example in this case:
		//
		// - folder1/folder2
		// - Client 1 sync folder2, but not folder1
		// - Client 2 sync and get folder2 only
		// - Client 2 export data
		// => Crash if we don't handle this case

		await Folder.save({ title: 'orphan', parent_id: '0c5bbd8a1b5a48189484a412a7e534cc' });

		const service = InteropService.instance();

		const result = await service.export({
			path: exportDir(),
			format: 'md',
		});

		expect(result.warnings.length).toBe(0);
	}));

	it('should allow registering new import modules', asyncTest(async () => {
		const testImportFilePath = `${exportDir()}/testImport${Math.random()}.test`;
		await shim.fsDriver().writeFile(testImportFilePath, 'test', 'utf8');

		const result = {
			hasBeenExecuted: false,
			sourcePath: '',
		};

		const module: Module = {
			type: ModuleType.Importer,
			description: 'Test Import Module',
			format: 'testing',
			fileExtensions: ['test'],
			isCustom: true,

			onExec: async (context: CustomImportContext) => {
				result.hasBeenExecuted = true;
				result.sourcePath = context.sourcePath;
			},
		};

		const service = InteropService.instance();
		service.registerModule(module);
		await service.import({
			format: 'testing',
			path: testImportFilePath,
		});

		expect(result.hasBeenExecuted).toBe(true);
		expect(result.sourcePath).toBe(testImportFilePath);
	}));

	it('should allow registering new export modules', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await Note.save({ title: 'note2', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);

		const filePath = `${exportDir()}/example.test`;

		const result: any = {
			destPath: '',
			itemTypes: [],
			items: [],
			resources: [],
			filePaths: [],
			closeCalled: false,
		};

		const module: Module = {
			type: ModuleType.Exporter,
			description: 'Test Export Module',
			format: 'testing',
			fileExtensions: ['test'],
			isCustom: true,

			onInit: async (context: CustomExportContext) => {
				result.destPath = context.destPath;
			},

			onProcessItem: async (_context: CustomExportContext, itemType: number, item: any) => {
				result.itemTypes.push(itemType);
				result.items.push(item);
			},

			onProcessResource: async (_context: CustomExportContext, resource: any, filePath: string) => {
				result.resources.push(resource);
				result.filePaths.push(filePath);
			},

			onClose: async (_context: CustomExportContext) => {
				result.closeCalled = true;
			},
		};

		const service = InteropService.instance();
		service.registerModule(module);
		await service.export({
			format: 'testing',
			path: filePath,
		});

		expect(result.destPath).toBe(filePath);
		expect(result.itemTypes.sort().join('_')).toBe('1_1_2_4');
		expect(result.items.length).toBe(4);
		expect(result.items.map((o: any) => o.title).sort().join('_')).toBe('folder1_note1_note2_photo.jpg');
		expect(result.resources.length).toBe(1);
		expect(result.resources[0].title).toBe('photo.jpg');
		expect(result.filePaths.length).toBe(1);
		expect(!!result.filePaths[0]).toBe(true);
		expect(result.closeCalled).toBe(true);
	}));


});
