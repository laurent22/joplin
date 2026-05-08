import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';

describe('UserItemModel', () => {

	beforeAll(async () => {
		await beforeAllDb('UserItemModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should throw error if item does not exist', async () => {
		const mockUserId = 'not-a-real-user-id';
		const mockId = 'not-a-real-item-id';
		await expect(models().userItem().add(mockUserId, mockId)).rejects.toThrow('No such item: not-a-real-item-id');
	});
});

