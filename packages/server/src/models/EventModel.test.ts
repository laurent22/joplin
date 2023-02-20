import { EventType } from '../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';
import { msleep } from '../utils/time';

describe('EventModel', () => {

	beforeAll(async () => {
		await beforeAllDb('EventModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create an event', async () => {
		await models().event().create(EventType.TaskStarted, 'deleteExpiredTokens');

		const events = await models().event().all();
		expect(events.length).toBe(1);
		expect(events[0].type).toBe(EventType.TaskStarted);
		expect(events[0].name).toBe('deleteExpiredTokens');
	});

	test('should get the latest event', async () => {
		await models().event().create(EventType.TaskStarted, 'deleteExpiredTokens');
		await msleep(1);
		await models().event().create(EventType.TaskStarted, 'deleteExpiredTokens');

		const allEvents = (await models().event().all()).sort((a, b) => a.created_time < b.created_time ? -1 : +1);
		expect(allEvents[0].created_time).toBeLessThan(allEvents[1].created_time);

		const latest = await models().event().lastEventByTypeAndName(EventType.TaskStarted, 'deleteExpiredTokens');
		expect(latest.id).toBe(allEvents[1].id);
	});

});
