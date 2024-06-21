import { ModelType } from '../../BaseModel';
import Note from '../../models/Note';
import Resource from '../../models/Resource';
import shim from '../../shim';
import { db, msleep, newOcrService, ocrSampleDir, resourceService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { ResourceOcrStatus } from '../database/types';
import SearchEngine from './SearchEngine';

const newSearchEngine = () => {
	const engine = new SearchEngine();
	engine.setDb(db());
	return engine;
};

const createNoteAndResource = async () => {
	const note = await Note.save({});
	await Note.save({});
	await shim.attachFileToNote(note, `${ocrSampleDir}/testocr.png`);
	const resource = (await Resource.all())[0];

	await resourceService().indexNoteResources();

	return { note, resource };
};

describe('SearchEngine.resources', () => {

	beforeEach(async () => {
		global.console = require('console');
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should index resources', async () => {
		const engine = newSearchEngine();

		await Resource.save({
			id: '00000000000000000000000000000001',
			mime: 'image/jpeg',
			title: 'Bonjour ça va ?',
			ocr_status: ResourceOcrStatus.Done,
			ocr_text: 'héllô, hôw äre yoù ?',
		}, { isNew: true });

		await engine.syncTables();

		const normalized = await db().selectAll('select * from items_normalized');
		expect(normalized[0].title).toBe('bonjour ca va ?');
		expect(normalized[0].body).toBe('hello, how are you ?');
	});

	it('should return notes associated with indexed resources', (async () => {
		const { note, resource } = await createNoteAndResource();

		const ocrService = newOcrService();
		await ocrService.processResources();

		const searchEngine = newSearchEngine();
		await searchEngine.syncTables();

		const results = await searchEngine.search('lazy fox');
		expect(results.length).toBe(1);
		expect(results[0].id).toBe(note.id);
		expect(results[0].item_id).toBe(resource.id);
		expect(results[0].item_type).toBe(ModelType.Resource);

		await ocrService.dispose();
	}));

	it('should not return resources associated with deleted notes', (async () => {
		const { note } = await createNoteAndResource();
		const note2 = await Note.save({ body: 'lazy fox' });
		await Note.delete(note.id, { toTrash: true });

		const ocrService = newOcrService();
		await ocrService.processResources();

		const searchEngine = newSearchEngine();
		await searchEngine.syncTables();

		const results = await searchEngine.search('lazy fox');
		expect(results.length).toBe(1);
		expect(results[0].id).toBe(note2.id);
	}));

	it('should delete normalized data when a resource is deleted', async () => {
		const engine = newSearchEngine();

		const resource = await Resource.save({
			id: '00000000000000000000000000000001',
			mime: 'image/jpeg',
			title: 'hello',
			ocr_status: ResourceOcrStatus.Done,
			ocr_text: 'hi',
		}, { isNew: true });

		await engine.syncTables();

		expect((await db().selectAll('select * from items_normalized')).length).toBe(1);

		await Resource.delete(resource.id);

		expect((await db().selectAll('select * from items_normalized')).length).toBe(0);
	});

	it('should sort resources', async () => {
		const engine = newSearchEngine();

		const resourceData = [
			['abcd abcd abcd', 'efgh'],
			['abcd', 'ijkl'],
			['ijkl', 'mnop'],
		];

		for (const [title, body] of resourceData) {
			await Resource.save({
				mime: 'image/jpeg',
				title,
				ocr_status: ResourceOcrStatus.Done,
				ocr_text: body,
			});
			await msleep(1);
		}

		await engine.syncTables();

		const results = await engine.search('abcd', { includeOrphanedResources: true });
		expect(results[0].title).toBe('abcd abcd abcd');
		expect(results[1].title).toBe('abcd');
	});

});
