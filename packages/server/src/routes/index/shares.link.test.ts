import { Share, ShareType } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { postApi } from '../../utils/testing/apiUtils';
import { testImageBuffer } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, parseHtml, beforeEachDb, createUserAndSession, koaAppContext, checkContextError, expectNotThrow, createNote, createItem, models, expectHttpError, createResource } from '../../utils/testing/testUtils';

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
	return context.response.body as any;
}

describe('shares.link', () => {

	beforeAll(async () => {
		await beforeAllDb('shares.link');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should display a simple note', async () => {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			title: 'Testing title',
			body: 'Testing body',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		const bodyHtml = await getShareContent(share.id);

		// Check that a few important strings are present
		expect(bodyHtml).toContain('rendered-md'); // Means we have the HTML body
		expect(bodyHtml).toContain('Testing title'); // Means the note has been rendered
		expect(bodyHtml).toContain('Testing body');
		expect(bodyHtml).toContain('<title>Testing title'); // Means the page title is set to the note title
	});

	test('should load plugins', async () => {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			body: '$\\sqrt{3x-1}+(1+x)^2$',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		const bodyHtml = await getShareContent(share.id);

		expect(bodyHtml).toContain('class="katex-mathml"');
	});

	test('should render attached images', async () => {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
		});

		await createItem(session.id, 'root:/96765a68655f4446b3dbad7d41b6566e.md:', resourceContents.image);
		await createItem(session.id, 'root:/.resource/96765a68655f4446b3dbad7d41b6566e:', await testImageBuffer());

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
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

	test('should share a linked note', async () => {
		const { session } = await createUserAndSession();

		const linkedNote1 = await createNote(session.id, {
			id: '000000000000000000000000000000C1',
		});

		const resource = await createResource(session.id, {
			id: '000000000000000000000000000000E1',
		}, 'test');

		const linkedNote2 = await createNote(session.id, {
			id: '000000000000000000000000000000C2',
			body: `[](:/${resource.jop_id})`,
		});

		const rootNote = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: `[](:/${linkedNote1.jop_id}) [](:/${linkedNote2.jop_id})`,
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: rootNote.jop_id,
			recursive: 1,
		});

		const bodyHtml = await getShareContent(share.id, { note_id: '000000000000000000000000000000C2' }) as string;
		const doc = parseHtml(bodyHtml);
		const image = doc.querySelector('a[data-resource-id="000000000000000000000000000000E1"]');
		expect(image.getAttribute('href')).toBe(`http://localhost:22300/shares/${share.id}?resource_id=000000000000000000000000000000E1&t=1602758278090`);

		const resourceContent = await getShareContent(share.id, { resource_id: '000000000000000000000000000000E1' });
		expect(resourceContent.toString()).toBe('test');
	});

	test('should not share items that are not linked to a shared note', async () => {
		const { session } = await createUserAndSession();

		const notSharedResource = await createResource(session.id, {
			id: '000000000000000000000000000000E2',
		}, 'test2');

		await createNote(session.id, {
			id: '000000000000000000000000000000C5',
			body: `[](:/${notSharedResource.jop_id})`,
		});

		const rootNote = await createNote(session.id, {
			id: '00000000000000000000000000000001',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: rootNote.jop_id,
			recursive: 1,
		});

		await expectNotThrow(async () => getShareContent(share.id, { note_id: '00000000000000000000000000000001' }));
		await expectHttpError(async () => getShareContent(share.id, { note_id: '000000000000000000000000000000C5' }), ErrorNotFound.httpCode);
		await expectHttpError(async () => getShareContent(share.id, { note_id: '000000000000000000000000000000E2' }), ErrorNotFound.httpCode);
	});

	test('should not share linked notes if the "recursive" field is not set', async () => {
		const { session } = await createUserAndSession();

		const linkedNote1 = await createNote(session.id, {
			id: '000000000000000000000000000000C1',
		});

		const rootNote = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: `[](:/${linkedNote1.jop_id})`,
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: rootNote.jop_id,
		});

		await expectHttpError(async () => getShareContent(share.id, { note_id: '000000000000000000000000000000C1' }), ErrorForbidden.httpCode);
	});

	test('should not throw an error if the note contains links to non-existing items', async () => {
		const { session } = await createUserAndSession();

		{
			const noteItem = await createNote(session.id, {
				id: '00000000000000000000000000000001',
				body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
			});

			const share = await postApi<Share>(session.id, 'shares', {
				type: ShareType.Note,
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
				type: ShareType.Note,
				note_id: noteItem.jop_id,
			});

			await expectNotThrow(async () => getShareContent(share.id));
		}
	});

	test('should throw an error if owner of share is disabled', async () => {
		const { user, session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: 'testing',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		await models().user().save({
			id: user.id,
			enabled: 0,
		});

		await expectHttpError(async () => getShareContent(share.id), ErrorForbidden.httpCode);
	});

});
