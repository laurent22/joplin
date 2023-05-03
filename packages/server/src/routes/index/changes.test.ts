import { beforeAllDb, afterAllTests, beforeEachDb, createItemTree, createUserAndSession, parseHtml } from '../../utils/testing/testUtils';
import { execRequest } from '../../utils/testing/apiUtils';

describe('index_changes', () => {

	beforeAll(async () => {
		await beforeAllDb('index_changes');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should list changes', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1, true);

		const items: any = {};
		for (let i = 1; i <= 150; i++) {
			items[(`${i}`).padStart(32, '0')] = {};
		}

		await createItemTree(user1.id, '', items);

		// Just some basic tests to check that we're seeing at least the first
		// and last item of each page.

		{
			const response: string = await execRequest(session1.id, 'GET', 'changes');
			const navLinks = parseHtml(response).querySelectorAll('.pagination-link');
			expect(response.includes('00000000000000000000000000000150.md')).toBe(true);
			expect(response.includes('00000000000000000000000000000051.md')).toBe(true);
			expect(navLinks.length).toBe(2);
			expect(navLinks[0].getAttribute('class')).toContain('is-current');
			expect(navLinks[1].getAttribute('class')).not.toContain('is-current');
		}

		{
			const response: string = await execRequest(session1.id, 'GET', 'changes', null, { query: { page: 2 } });
			const navLinks = parseHtml(response).querySelectorAll('.pagination-link');
			expect(response.includes('00000000000000000000000000000050.md')).toBe(true);
			expect(response.includes('00000000000000000000000000000001.md')).toBe(true);
			expect(navLinks.length).toBe(2);
			expect(navLinks[0].getAttribute('class')).not.toContain('is-current');
			expect(navLinks[1].getAttribute('class')).toContain('is-current');
		}
	});

});
