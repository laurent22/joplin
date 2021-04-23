import { Share, ShareType } from '../../db';
import routeHandler from '../../middleware/routeHandler';
import { postApi } from '../../utils/testing/apiUtils';
import { testImageBuffer } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, parseHtml, beforeEachDb, createUserAndSession, koaAppContext, checkContextError, expectNotThrow, createNote, createItem } from '../../utils/testing/testUtils';

const resourceSize = 2720;

const resourceContents: Record<string, string> = {
	image: `Test Image

id: 96765a68655f4446b3dbad7d41b6566e
mime: image/jpeg
filename: 
created_time: 2020-10-15T10:37:58.090Z
updated_time: 2020-10-15T10:37:58.090Z
user_created_time: 2020-10-15T10:37:58.090Z
user_updated_time: 2020-10-15T10:37:58.090Z
file_extension: jpg
encryption_cipher_text: 
encryption_applied: 0
encryption_blob_encrypted: 0
size: ${resourceSize}
is_shared: 0
type_: 4`,

};

async function getShareContent(shareId: string, query: any = {}): Promise<string | Buffer> {
	const context = await koaAppContext({
		request: {
			method: 'GET',
			url: `/shares/${shareId}`,
			query,
		},
	});
	await routeHandler(context);
	await checkContextError(context);
	return context.response.body;
}

describe('shares.link', function() {

	beforeAll(async () => {
		await beforeAllDb('shares.link');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should display a simple note', async function() {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			title: 'Testing title',
			body: 'Testing body',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Link,
			note_id: noteItem.jop_id,
		});

		const bodyHtml = await getShareContent(share.id);

		// Check that a few important strings are present
		expect(bodyHtml).toContain('rendered-md'); // Means we have the HTML body
		expect(bodyHtml).toContain('Testing title'); // Means the note has been rendered
		expect(bodyHtml).toContain('Testing body');
	});

	test('should load plugins', async function() {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			body: '$\\sqrt{3x-1}+(1+x)^2$',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Link,
			note_id: noteItem.jop_id,
		});

		const bodyHtml = await getShareContent(share.id);

		expect(bodyHtml).toContain('class="katex-mathml"');
	});

	test('should render attached images', async function() {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
		});

		await createItem(session.id, 'root:/96765a68655f4446b3dbad7d41b6566e.md:', resourceContents.image);
		await createItem(session.id, 'root:/.resource/96765a68655f4446b3dbad7d41b6566e:', await testImageBuffer());

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Link,
			note_id: noteItem.jop_id,
		});

		const bodyHtml = await getShareContent(share.id) as string;

		// We should get an image like this:
		//
		// <img data-from-md data-resource-id="96765a68655f4446b3dbad7d41b6566e" src="http://localhost:22300/shares/TJsBi9Is1SsJXPRw5MW9HkItiq0PDu6x?resource_id=96765a68655f4446b3dbad7d41b6566e&amp;t=1602758278090" title=""/>

		const doc = parseHtml(bodyHtml);
		const image = doc.querySelector('img[data-resource-id="96765a68655f4446b3dbad7d41b6566e"]');
		expect(image.getAttribute('src')).toBe(`http://localhost:22300/shares/${share.id}?resource_id=96765a68655f4446b3dbad7d41b6566e&t=1602758278090`);

		// If we try to get the resource, via the share link, we should get the
		// full image.
		const resourceContent = await getShareContent(share.id, {
			resource_id: '96765a68655f4446b3dbad7d41b6566e',
			t: '1602758278090',
		}) as Buffer;

		expect(resourceContent.byteLength).toBe(resourceSize);
	});

	test('should not throw an error if the note contains links to non-existing items', async function() {
		const { session } = await createUserAndSession();

		{
			const noteItem = await createNote(session.id, {
				id: '00000000000000000000000000000001',
				body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
			});

			const share = await postApi<Share>(session.id, 'shares', {
				type: ShareType.Link,
				note_id: noteItem.jop_id,
			});

			await expectNotThrow(async () => getShareContent(share.id));
		}

		{
			const noteItem = await createNote(session.id, {
				id: '00000000000000000000000000000002',
				body: '[missing too](:/531a2a839a2c493a88c45e39c6cb9ed4)',
			});

			const share = await postApi<Share>(session.id, 'shares', {
				type: ShareType.Link,
				note_id: noteItem.jop_id,
			});

			await expectNotThrow(async () => getShareContent(share.id));
		}
	});

});
