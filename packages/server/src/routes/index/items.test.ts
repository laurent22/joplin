import { beforeAllDb, afterAllTests, beforeEachDb, createItemTree, createUserAndSession, parseHtml, expectHttpError, expectNoHttpError, createItem, createResource, models } from '../../utils/testing/testUtils';
import { execRequest, execRequestC } from '../../utils/testing/apiUtils';
import { Uuid } from '../../services/database/types';
import { makeNoteSerializedBody } from '../../utils/testing/serializedItems';

describe('index_items', () => {

	beforeAll(async () => {
		await beforeAllDb('index_items');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should list the user items', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1, true);

		const items: Record<string, Record<string, never>> = {};
		for (let i = 1; i <= 150; i++) {
			items[(`${i}`).padStart(32, '0')] = {};
		}

		await createItemTree(user1.id, '', items);

		// Just some basic tests to check that we're seeing at least the first
		// and last item of each page. And that the navigation bar is there with
		// the right elements.

		{
			const response: string = await execRequest(session1.id, 'GET', 'items');
			const navLinks = parseHtml(response).querySelectorAll('.pagination-link');
			expect(response.includes('00000000000000000000000000000001.md')).toBe(true);
			expect(response.includes('00000000000000000000000000000100.md')).toBe(true);
			expect(navLinks.length).toBe(2);
			expect(navLinks[0].getAttribute('class')).toContain('is-current');
			expect(navLinks[1].getAttribute('class')).not.toContain('is-current');
		}

		{
			const response: string = await execRequest(session1.id, 'GET', 'items', null, { query: { page: 2 } });
			const navLinks = parseHtml(response).querySelectorAll('.pagination-link');
			expect(response.includes('00000000000000000000000000000101.md')).toBe(true);
			expect(response.includes('00000000000000000000000000000150.md')).toBe(true);
			expect(navLinks.length).toBe(2);
			expect(navLinks[0].getAttribute('class')).not.toContain('is-current');
			expect(navLinks[1].getAttribute('class')).toContain('is-current');
		}
	});

	test('should disallow accessing other users\' items from items/:id/content', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const itemJoplinId = '96765a68655f4446b3dbad7d41b6566e';
		const item = await createItem(
			session1.id,
			`root:/${itemJoplinId}.md:`,
			makeNoteSerializedBody({
				id: itemJoplinId,
			}),
		);

		const requestItem = (sessionId: Uuid) => {
			return execRequest(sessionId, 'GET', `items/${item.id}/content`);
		};

		await expectNoHttpError(async () => {
			await requestItem(session1.id);
		});
		await expectHttpError(async () => {
			await requestItem(session2.id);
		}, 404);
	});

	test('should sanitise response headers when serving user-controlled MIME types', async () => {
		const { user, session } = await createUserAndSession(1);

		const resource = await createResource(session.id, {
			id: '000000000000000000000000000000E1',
		}, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

		await models().item().saveForUser(user.id, { id: resource.id, mime_type: 'image/svg+xml' });

		const dangerous = await execRequestC(session.id, 'GET', `items/${resource.id}/content`);
		expect(dangerous.response.get('Content-Type')).toBe('application/octet-stream');
		expect(dangerous.response.get('Content-Disposition').startsWith('attachment;')).toBe(true);
		expect(dangerous.response.get('X-Content-Type-Options')).toBe('nosniff');
		const csp = dangerous.response.get('Content-Security-Policy');
		expect(csp).toContain('default-src \'none\'');
		expect(csp).toContain('sandbox');

		await models().item().saveForUser(user.id, { id: resource.id, mime_type: 'image/png' });

		const safe = await execRequestC(session.id, 'GET', `items/${resource.id}/content`);
		expect(safe.response.get('Content-Type')).toBe('image/png');
		expect(safe.response.get('Content-Disposition').startsWith('inline;')).toBe(true);
		expect(safe.response.get('X-Content-Type-Options')).toBe('nosniff');
		const safeCsp = safe.response.get('Content-Security-Policy');
		expect(safeCsp).toContain('default-src \'none\'');
		expect(safeCsp).toContain('sandbox');
	});
});
