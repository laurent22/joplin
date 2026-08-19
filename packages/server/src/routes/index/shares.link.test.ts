import { Share, ShareType } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { postApi } from '../../utils/testing/apiUtils';
import { testImageBuffer } from '../../utils/testing/fileApiUtils';
import { beforeAllDb, afterAllTests, parseHtml, beforeEachDb, createUserAndSession, koaAppContext, checkContextError, expectNotThrow, createNote, createItem, models, expectHttpError, createResource, createFolder } from '../../utils/testing/testUtils';

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

async function getShareContent(shareId: string, query: Record<string, string> = {}): Promise<string | Buffer> {
	const context = await getShareResponse(shareId, query);
	return context.response.body as string | Buffer;
}

async function getShareResponse(shareId: string, query: Record<string, string> = {}) {
	const context = await koaAppContext({
		request: {
			method: 'GET',
			url: `/shares/${shareId}`,
			query,
		},
	});
	await routeHandler(context);
	await checkContextError(context);
	return context;
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

	// SVG is served inline but the strict CSP + sandbox blocks the embedded script.
	test('should serve SVG inline under a strict CSP that blocks scripts', async () => {
		const { session } = await createUserAndSession();

		const svgPayload = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

		const resource = await createResource(session.id, {
			id: '000000000000000000000000000000E1',
			title: '',
			mime: 'image/svg+xml',
			file_extension: 'svg',
		}, svgPayload);

		const noteItem = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: `![x](:/${resource.jop_id})`,
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		const context = await getShareResponse(share.id, { resource_id: '000000000000000000000000000000E1' });
		expect(context.response.get('Content-Type')).toBe('image/svg+xml');
		expect(context.response.get('Content-Disposition').startsWith('inline;')).toBe(true);
		expect(context.response.get('X-Content-Type-Options')).toBe('nosniff');
		const csp = context.response.get('Content-Security-Policy');
		expect(csp).toContain('default-src \'none\'');
		expect(csp).toContain('sandbox');
	});

	test('should serve safe resource mimes inline with hardened headers', async () => {
		const { session } = await createUserAndSession();

		const resource = await createResource(session.id, {
			id: '000000000000000000000000000000E1',
			title: 'photo.png',
			mime: 'image/png',
			file_extension: 'png',
		}, 'fake-png-bytes');

		const noteItem = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: `![x](:/${resource.jop_id})`,
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		const context = await getShareResponse(share.id, { resource_id: '000000000000000000000000000000E1' });
		expect(context.response.get('Content-Type')).toBe('image/png');
		expect(context.response.get('Content-Disposition').startsWith('inline;')).toBe(true);
		expect(context.response.get('X-Content-Type-Options')).toBe('nosniff');
		const csp = context.response.get('Content-Security-Policy');
		expect(csp).toContain('default-src \'none\'');
		expect(csp).toContain('sandbox');
	});

	test('should display the published folder root page', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'My Note' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const bodyHtml = await getShareContent(share.id) as string;

		expect(bodyHtml).toContain('folder-tree-data');
		expect(bodyHtml).toContain('My Notebook');
		expect(bodyHtml).toContain('My Note');
	});

	test('should display a note inside a published folder', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'Note Title', body: 'Note body content' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const bodyHtml = await getShareContent(share.id, { note_id: '00000000000000000000000000000001' }) as string;

		expect(bodyHtml).toContain('Note Title');
		expect(bodyHtml).toContain('Note body content');
		expect(bodyHtml).toContain('folder-tree-data');
	});

	test('should show an empty state for a note_id that is not inside the published folder', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createFolder(session.id, { id: '000000000000000000000000000000F2', title: 'Other Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000099', parent_id: '000000000000000000000000000000F2', title: 'Other Note' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const bodyHtml = await getShareContent(share.id, { note_id: '00000000000000000000000000000099' }) as string;

		expect(bodyHtml).toContain('folder-tree-data');
		expect(bodyHtml).toContain('Item &quot;00000000000000000000000000000099&quot; does not belong to this share');
		expect(bodyHtml).not.toContain('Other Note');
	});

	test('should serve a resource linked from a note inside the published folder', async () => {
		const { session } = await createUserAndSession();
		const resourceId = '000000000000000000000000000000E1';

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, {
			id: '00000000000000000000000000000001',
			parent_id: '000000000000000000000000000000F1',
			body: '[file](:/000000000000000000000000000000E1)',
		});
		await createResource(session.id, { id: resourceId }, 'resource content');

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const resourceContent = await getShareContent(share.id, {
			note_id: '00000000000000000000000000000001',
			resource_id: resourceId,
		});

		expect(resourceContent.toString()).toBe('resource content');
	});

	test('should display note and resource content from a published folder when E2EE is enabled', async () => {
		const { session } = await createUserAndSession();
		const folderId = '000000000000000000000000000000F1';
		const noteId = '00000000000000000000000000000001';
		const resourceId = '000000000000000000000000000000E1';

		await createItem(session.id, 'root:/info.json:', JSON.stringify({
			version: 3,
			e2ee: {
				value: true,
				updatedTime: 0,
			},
		}));
		await createFolder(session.id, { id: folderId, title: 'Published Notebook' });
		await createNote(session.id, {
			id: noteId,
			parent_id: folderId,
			title: 'Readable note title',
			body: `Readable note body [resource](:/${resourceId})`,
		});
		await createResource(session.id, { id: resourceId }, 'readable resource content');

		await expectHttpError(
			async () => getShareContent('not_published', { note_id: noteId }),
			ErrorNotFound.httpCode,
		);
		await expectHttpError(
			async () => getShareContent('not_published', {
				note_id: noteId,
				resource_id: resourceId,
			}),
			ErrorNotFound.httpCode,
		);

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: folderId,
			type: ShareType.PublishedFolder,
		});

		const bodyHtml = await getShareContent(share.id, { note_id: noteId }) as string;
		const doc = parseHtml(bodyHtml);
		const resourceLink = doc.querySelector(`a[data-resource-id="${resourceId}"]`);

		expect(bodyHtml).toContain('Readable note title');
		expect(bodyHtml).toContain('Readable note body');
		expect(bodyHtml).toContain('folder-tree-data');
		expect(bodyHtml).not.toContain('JED');
		expect(resourceLink.getAttribute('href')).toContain(`/shares/${share.id}?resource_id=${resourceId}`);
		expect(resourceLink.getAttribute('href')).toContain(`note_id=${noteId}`);

		const resourceContent = await getShareContent(share.id, {
			note_id: noteId,
			resource_id: resourceId,
		});

		const resourceText = resourceContent.toString();
		expect(resourceText).toBe('readable resource content');
		expect(resourceText).not.toContain('JED');
	});

	test('should reject resource_id with no note_id in a published folder', async () => {
		const { session } = await createUserAndSession();
		const resourceId = '000000000000000000000000000000E1';

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createResource(session.id, { id: resourceId }, 'resource content');

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		await expectHttpError(
			async () => getShareContent(share.id, { resource_id: resourceId }),
			ErrorNotFound.httpCode,
		);
	});

	test('should reject a resource not linked from the selected note', async () => {
		const { session } = await createUserAndSession();
		const resourceId = '000000000000000000000000000000E1';

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, {
			id: '00000000000000000000000000000001',
			parent_id: '000000000000000000000000000000F1',
			body: '',
		});
		await createResource(session.id, { id: resourceId }, 'resource content');

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		await expectHttpError(
			async () => getShareContent(share.id, {
				note_id: '00000000000000000000000000000001',
				resource_id: resourceId,
			}),
			ErrorNotFound.httpCode,
		);
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
