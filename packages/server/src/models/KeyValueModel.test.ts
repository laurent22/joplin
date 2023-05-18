import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';

describe('KeyValueModel', () => {

	beforeAll(async () => {
		await beforeAllDb('KeyValueModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should set and get value', async () => {
		const m = models().keyValue();

		await m.setValue('testing1', 'something');
		await m.setValue('testing2', 1234);

		expect(await m.value('testing1')).toBe('something');
		expect(await m.value('testing2')).toBe(1234);

		await m.setValue('testing1', 456);
		expect(await m.value('testing1')).toBe(456);
	});

	test('should delete value', async () => {
		const m = models().keyValue();

		await m.setValue('testing1', 'something');
		await m.deleteValue('testing1');

		expect(await m.value('testing1')).toBe(null);
	});

});
