import { beforeAllDb, afterAllTests, beforeEachDb, createItemTree, createUserAndSession } from '../../utils/testing/testUtils';
import { execRequest } from '../../utils/testing/apiUtils';

describe('index_items', function() {

	beforeAll(async () => {
		await beforeAllDb('index_items');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should list changes', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);

		const items: any = {};
		for (let i = 1; i <= 150; i++) {
			items[(`${i}`).padStart(32, '0')] = {};
		}

		await createItemTree(user1.id, '', items);

		// Just some basic tests to check that we're seeing at least the first
		// and last item of each page.

		{
			const response: string = await execRequest(session1.id, 'GET', 'changes');
			expect(response.includes('00000000000000000000000000000150.md')).toBe(true);
			expect(response.includes('00000000000000000000000000000051.md')).toBe(true);
		}

		{
			const response: string = await execRequest(session1.id, 'GET', 'changes', null, { query: { page: 2 } });
			expect(response.includes('00000000000000000000000000000050.md')).toBe(true);
			expect(response.includes('00000000000000000000000000000001.md')).toBe(true);
		}
	});

});
