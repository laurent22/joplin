import * as fs from 'fs-extra';
import { setupDatabaseAndSynchronizer, switchClient, exportDir, supportDir } from '../../testing/test-utils.js';
import InteropService_Exporter_Md from '../../services/interop/InteropService_Exporter_Md';
import BaseModel from '../../BaseModel';
import Folder from '../../models/Folder';
import Resource from '../../models/Resource';
import Note from '../../models/Note';
import shim from '../../shim';
import { MarkupToHtml } from '@joplin/renderer';
import { NoteEntity, ResourceEntity } from '../database/types.js';
import InteropService from './InteropService.js';
import { fileExtension } from '../../path-utils.js';

describe('interop/InteropService_Exporter_Md', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		await fs.remove(exportDir());
		await fs.mkdirp(exportDir());
	});

	it('should create resources directory', (async () => {
		const service = new InteropService_Exporter_Md();
		await service.init(exportDir());

		expect(await shim.fsDriver().exists(`${exportDir()}/_resources/`)).toBe(true);
	}));

	it('should create note paths and add them to context', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note1.body))[0]);

		const folder2 = await Folder.save({ title: 'folder2' });
		let note3 = await Note.save({ title: 'note3', parent_id: folder2.id, markup_language: MarkupToHtml.MARKUP_LANGUAGE_HTML });
		await shim.attachFileToNote(note3, `${supportDir}/photo.jpg`);
		note3 = await Note.load(note3.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note3);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note3.body))[0]);

		expect(!exporter.context() && !(exporter.context().notePaths || Object.keys(exporter.context().notePaths).length)).toBe(false);

		await exporter.processItem(Folder.modelType(), folder1);
		await exporter.processItem(Folder.modelType(), folder2);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		expect(Object.keys(exporter.context().notePaths).length).toBe(3);
		expect(exporter.context().notePaths[note1.id]).toBe('folder1/note1.md');
		expect(exporter.context().notePaths[note2.id]).toBe('folder1/note2.md');
		expect(exporter.context().notePaths[note3.id]).toBe('folder2/note3.html');
	}));

	it('should create resource paths and add them to context', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note1.body))[0]);
		const resource1 = await Resource.load(itemsToExport[3].itemOrId);

		const folder2 = await Folder.save({ title: 'folder2' });
		let note3 = await Note.save({ title: 'note3', parent_id: folder2.id });
		await shim.attachFileToNote(note3, `${supportDir}/photo.jpg`);
		note3 = await Note.load(note3.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note3);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note3.body))[0]);
		const resource2 = await Resource.load(itemsToExport[6].itemOrId);

		await exporter.processItem(Folder.modelType(), folder1);
		await exporter.processItem(Folder.modelType(), folder2);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		await exporter.processResource(resource1, Resource.fullPath(resource1));
		await exporter.processResource(resource2, Resource.fullPath(resource2));

		expect(!exporter.context() && !(exporter.context().destResourcePaths || Object.keys(exporter.context().destResourcePaths).length)).toBe(false);

		expect(Object.keys(exporter.context().destResourcePaths).length).toBe(2);
		expect(exporter.context().destResourcePaths[resource1.id]).toBe(`${exportDir()}/_resources/photo.jpg`);
		expect(exporter.context().destResourcePaths[resource2.id]).toBe(`${exportDir()}/_resources/photo-1.jpg`);
	}));

	it('should handle duplicate note names', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
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

		await exporter.processItem(Folder.modelType(), folder1);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		expect(Object.keys(exporter.context().notePaths).length).toBe(2);
		expect(exporter.context().notePaths[note1.id]).toBe('folder1/note1.md');
		expect(exporter.context().notePaths[note1_2.id]).toBe('folder1/note1-1.md');
	}));

	it('should not override existing files', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);

		await exporter.processItem(Folder.modelType(), folder1);
		// Create a file with the path of note1 before processing note1
		await shim.fsDriver().writeFile(`${exportDir()}/folder1/note1.md`, 'Note content', 'utf-8');

		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);

		expect(Object.keys(exporter.context().notePaths).length).toBe(1);
		expect(exporter.context().notePaths[note1.id]).toBe('folder1/note1-1.md');
	}));

	it('should save resource files in _resource directory', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note1.body))[0]);
		const resource1 = await Resource.load(itemsToExport[2].itemOrId);

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await shim.attachFileToNote(note2, `${supportDir}/photo.jpg`);
		note2 = await Note.load(note2.id);
		queueExportItem(BaseModel.TYPE_FOLDER, folder2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		queueExportItem(BaseModel.TYPE_RESOURCE, (await Note.linkedResourceIds(note2.body))[0]);
		const resource2 = await Resource.load(itemsToExport[5].itemOrId);

		await exporter.processResource(resource1, Resource.fullPath(resource1));
		await exporter.processResource(resource2, Resource.fullPath(resource2));

		expect(await shim.fsDriver().exists(`${exportDir()}/_resources/photo.jpg`)).toBe(true);
		expect(await shim.fsDriver().exists(`${exportDir()}/_resources/photo-1.jpg`)).toBe(true);
	}));

	it('should create folders in fs', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
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

		await exporter.processItem(Folder.modelType(), folder2);
		await exporter.processItem(Folder.modelType(), folder3);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note.modelType(), note2);

		expect(await shim.fsDriver().exists(`${exportDir()}/folder1`)).toBe(true);
		expect(await shim.fsDriver().exists(`${exportDir()}/folder1/folder2`)).toBe(true);
		expect(await shim.fsDriver().exists(`${exportDir()}/folder1/folder3`)).toBe(true);
	}));

	it('should save notes in fs', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
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
		await exporter.processItem(Note.modelType(), note1);
		await exporter.processItem(Note.modelType(), note2);
		await exporter.processItem(Note.modelType(), note3);

		expect(await shim.fsDriver().exists(`${exportDir()}/${exporter.context().notePaths[note1.id]}`)).toBe(true);
		expect(await shim.fsDriver().exists(`${exportDir()}/${exporter.context().notePaths[note2.id]}`)).toBe(true);
		expect(await shim.fsDriver().exists(`${exportDir()}/${exporter.context().notePaths[note3.id]}`)).toBe(true);
	}));

	it('should replace resource ids with relative paths', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);
		note1 = await Note.load(note1.id);
		queueExportItem(BaseModel.TYPE_NOTE, note1);
		const resource1 = await Resource.load((await Note.linkedResourceIds(note1.body))[0]);

		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await shim.attachFileToNote(note2, `${supportDir}/photo.jpg`);
		note2 = await Note.load(note2.id);
		queueExportItem(BaseModel.TYPE_NOTE, note2);
		const resource2 = await Resource.load((await Note.linkedResourceIds(note2.body))[0]);

		let note3 = await Note.save({ title: 'note3', parent_id: folder2.id });
		await shim.attachFileToNote(note3, `${supportDir}/photo.jpg`);
		note3 = await Note.load(note3.id);
		queueExportItem(BaseModel.TYPE_NOTE, note3);
		const resource3 = await Resource.load((await Note.linkedResourceIds(note3.body))[0]);
		note3 = await Note.save({ ...note3, body: `<img src=":/${resource3.id}" alt="alt">` });
		note3 = await Note.load(note3.id);

		let note4 = await Note.save({ title: 'note4', parent_id: folder2.id });
		await shim.attachFileToNote(note4, `${supportDir}/photo.jpg`);
		note4 = await Note.load(note4.id);
		queueExportItem(BaseModel.TYPE_NOTE, note4);
		const resource4 = await Resource.load((await Note.linkedResourceIds(note4.body))[0]);
		note4 = await Note.save({ ...note4, body: `![](:/${resource4.id} "title")` });
		note4 = await Note.load(note4.id);

		await exporter.processItem(Folder.modelType(), folder1);
		await exporter.processItem(Folder.modelType(), folder2);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processResource(resource1, Resource.fullPath(resource1));
		await exporter.processResource(resource2, Resource.fullPath(resource2));
		await exporter.processResource(resource3, Resource.fullPath(resource3));
		await exporter.processResource(resource4, Resource.fullPath(resource3));
		const context: any = {
			resourcePaths: {},
		};
		context.resourcePaths[resource1.id] = 'resource1.jpg';
		context.resourcePaths[resource2.id] = 'resource2.jpg';
		context.resourcePaths[resource3.id] = 'resource3.jpg';
		context.resourcePaths[resource4.id] = 'resource3.jpg';
		exporter.updateContext(context);
		await exporter.processItem(Note.modelType(), note1);
		await exporter.processItem(Note.modelType(), note2);
		await exporter.processItem(Note.modelType(), note3);
		await exporter.processItem(Note.modelType(), note4);

		const note1_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note1.id]}`);
		const note2_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note2.id]}`);
		const note3_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note3.id]}`);
		const note4_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note4.id]}`);

		expect(note1_body).toContain('](../_resources/photo.jpg)');
		expect(note2_body).toContain('](../../_resources/photo-1.jpg)');
		expect(note3_body).toContain('<img src="../../_resources/photo-2.jpg" alt="alt">');
		expect(note4_body).toContain('](../../_resources/photo-3.jpg "title")');
	}));

	it('should replace note ids with relative paths', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
			itemsToExport.push({
				type: itemType,
				itemOrId: itemOrId,
			});
		};

		const changeNoteBodyAndReload = async (note: NoteEntity, newBody: string) => {
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

		await exporter.processItem(Folder.modelType(), folder1);
		await exporter.processItem(Folder.modelType(), folder2);
		await exporter.processItem(Folder.modelType(), folder3);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note.modelType(), note1);
		await exporter.processItem(Note.modelType(), note2);
		await exporter.processItem(Note.modelType(), note3);

		const note1_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note1.id]}`);
		const note2_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note2.id]}`);
		const note3_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note3.id]}`);

		expect(note1_body).toContain('](../folder3/note3.md)');
		expect(note2_body).toContain('](../../folder3/note3.md)');
		expect(note2_body).toContain('](../../folder1/note1.md)');
		expect(note3_body).toContain('](../folder1/folder2/note2.md)');
	}));

	it('should url encode relative note links', (async () => {
		const exporter = new InteropService_Exporter_Md();
		await exporter.init(exportDir());

		const itemsToExport: any[] = [];
		const queueExportItem = (itemType: number, itemOrId: any) => {
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

		await exporter.processItem(Folder.modelType(), folder1);
		await exporter.prepareForProcessingItemType(BaseModel.TYPE_NOTE, itemsToExport);
		await exporter.processItem(Note.modelType(), note1);
		await exporter.processItem(Note.modelType(), note2);

		const note2_body = await shim.fsDriver().readFile(`${exportDir()}/${exporter.context().notePaths[note2.id]}`);
		expect(note2_body).toContain('[link](../folder%20with%20space1/note1%20name%20with%20space.md)');
	}));

	it('should preserve resource file extension', (async () => {
		const folder = await Folder.save({ title: 'testing' });
		const note = await Note.save({ title: 'mynote', parent_id: folder.id });
		await shim.attachFileToNote(note, `${supportDir}/photo.jpg`);

		const resource: ResourceEntity = (await Resource.all())[0];
		await Resource.save({ id: resource.id, title: 'veryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitleveryverylongtitle.jpg' });

		const service = InteropService.instance();

		await service.export({
			path: exportDir(),
			format: 'md',
		});

		const resourceFilename = (await fs.readdir(`${exportDir()}/_resources`))[0];
		expect(fileExtension(resourceFilename)).toBe('jpg');
	}));
	it('should url encode resource links', (async () => {
		const folder = await Folder.save({ title: 'testing' });
		const note = await Note.save({ title: 'mynote', parent_id: folder.id });
		await shim.attachFileToNote(note, `${supportDir}/photo.jpg`);

		const resource: ResourceEntity = (await Resource.all())[0];
		await Resource.save({ id: resource.id, title: 'name with spaces.jpg' });

		const service = InteropService.instance();

		await service.export({
			path: exportDir(),
			format: 'md',
		});

		const note_body = await shim.fsDriver().readFile(`${exportDir()}/testing/mynote.md`);
		expect(note_body).toContain('[photo.jpg](../_resources/name%20with%20spaces.jpg)');
	}));

});
