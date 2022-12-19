import { ModelType } from '../../../BaseModel';
import ItemChange from '../../../models/ItemChange';
import Note from '../../../models/Note';
import { expectThrow, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import { ItemChangeEntity } from '../../database/types';
import Api, { RequestMethod } from '../Api';

let api: Api = null;

describe('routes/events', function() {

	beforeEach(async () => {
		api = new Api();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should retrieve the latest events', async () => {
		let cursor = '0';

		{
			const response = await api.route(RequestMethod.GET, 'events', { cursor });
			expect(response.cursor).toBe('0');
		}

		const note1 = await Note.save({ title: 'toto' });
		await Note.save({ id: note1.id, title: 'tutu' });
		const note2 = await Note.save({ title: 'tata' });
		await ItemChange.waitForAllSaved();

		{
			const response = await api.route(RequestMethod.GET, 'events', { cursor });
			expect(response.cursor).toBe('3');
			expect(response.items.length).toBe(2);
			expect(response.has_more).toBe(false);
			expect(response.items.map((it: ItemChangeEntity) => it.item_id).sort()).toEqual([note1.id, note2.id].sort());

			cursor = response.cursor;
		}

		{
			const response = await api.route(RequestMethod.GET, 'events', { cursor });
			expect(response.cursor).toBe(cursor);
			expect(response.items.length).toBe(0);
			expect(response.has_more).toBe(false);
		}

		await Note.save({ id: note2.id, title: 'titi' });
		await ItemChange.waitForAllSaved();

		{
			const response = await api.route(RequestMethod.GET, 'events', { cursor });
			expect(response.cursor).toBe('4');
			expect(response.items.length).toBe(1);
			expect(response.items[0].item_id).toBe(note2.id);
		}
	});

	it('should limit the number of response items', async () => {
		const promises = [];
		for (let i = 0; i < 101; i++) {
			promises.push(Note.save({ title: 'toto' }));
		}

		await Promise.all(promises);
		await ItemChange.waitForAllSaved();

		const response1 = await api.route(RequestMethod.GET, 'events', { cursor: '0' });
		expect(response1.items.length).toBe(100);
		expect(response1.has_more).toBe(true);

		const response2 = await api.route(RequestMethod.GET, 'events', { cursor: response1.cursor });
		expect(response2.items.length).toBe(1);
		expect(response2.has_more).toBe(false);
	});

	it('should retrieve a single item', async () => {
		const beforeTime = Date.now();

		const note = await Note.save({ title: 'toto' });
		await ItemChange.waitForAllSaved();

		const response = await api.route(RequestMethod.GET, 'events/1');

		expect(response.item_type).toBe(ModelType.Note);
		expect(response.type).toBe(1);
		expect(response.item_id).toBe(note.id);
		expect(response.created_time).toBeGreaterThanOrEqual(beforeTime);

		await expectThrow(async () => api.route(RequestMethod.GET, 'events/1234'));
	});

});
