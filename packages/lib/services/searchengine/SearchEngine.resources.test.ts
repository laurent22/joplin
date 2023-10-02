import Resource from '../../models/Resource';
import { db, msleep, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { ResourceOcrStatus } from '../database/types';
import SearchEngine from './SearchEngine';

const newSearchEngine = () => {
	const engine = new SearchEngine();
	engine.setDb(db());
	return engine;
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
		await engine.syncTables();

		const normalized = await db().selectAll('select * from items_normalized');
		expect(normalized[0].title).toBe('bonjour ca va ?');
		expect(normalized[0].body).toBe('hello, how are you ?');
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
		await engine.syncTables();

		const results = await engine.search('abcd');
		expect(results[0].title).toBe('abcd abcd abcd');
		expect(results[1].title).toBe('abcd');
	});

});
