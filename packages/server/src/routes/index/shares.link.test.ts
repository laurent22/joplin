import { Share, ShareType } from '../../services/database/types';
import routeHandler from '../../middleware/routeHandler';
import ItemModel from '../../models/ItemModel';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { postApi } from '../../utils/testing/apiUtils';
import { testImageBuffer } from '../../utils/testing/fileApiUtils';
import { shareFolderWithUser } from '../../utils/testing/shareApiUtils';
import { beforeAllDb, afterAllTests, parseHtml, beforeEachDb, createUserAndSession, koaAppContext, checkContextError, expectNotThrow, createNote, createItem, models, expectHttpError, createResource, createFolder, updateNote, updateItem } from '../../utils/testing/testUtils';
import { makeFolderSerializedBody, makeNoteSerializedBody } from '../../utils/testing/serializedItems';
import { MarkupToHtml } from '@joplin/renderer';

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
		expect(bodyHtml).not.toContain('class="footer"');
		expect(bodyHtml).toContain('<title>Testing title'); // Means the page title is set to the note title
	});

	test('should render a published note once until it changes, without typographer', async () => {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: 'Some "quoted" text',
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		const render = jest.spyOn(MarkupToHtml.prototype, 'render');
		try {
			const bodyHtml = await getShareContent(share.id) as string;
			expect(bodyHtml).toContain('quoted');
			expect(bodyHtml).not.toContain('\u201c');

			await getShareContent(share.id);
			expect(render).toHaveBeenCalledTimes(1);

			await updateNote(session.id, { id: '00000000000000000000000000000001', body: 'Changed body' });
			expect(await getShareContent(share.id)).toContain('Changed body');
			expect(render).toHaveBeenCalledTimes(2);
		} finally {
			render.mockRestore();
		}
	});

	test('should not display a locked note', async () => {
		const { session } = await createUserAndSession();

		const noteItem = await createNote(session.id, {
			title: 'Locked',
			body: 'JLD01cipher',
			is_locked: 1,
		});

		const share = await postApi<Share>(session.id, 'shares', {
			type: ShareType.Note,
			note_id: noteItem.jop_id,
		});

		await expectHttpError(async () => getShareContent(share.id), ErrorForbidden.httpCode);
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

	test('should stop serving a note published by a participant once they are removed from the shared notebook', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { shareUser } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
						title: 'Owner note',
					},
				],
			},
		]);

		const share = await postApi<Share>(session2.id, 'shares', {
			type: ShareType.Note,
			note_id: '00000000000000000000000000000001',
		});

		expect(await getShareContent(share.id)).toContain('Owner note');

		await models().shareUser().delete(shareUser.id);
		await models().share().updateSharedItems3();

		await expectHttpError(async () => getShareContent(share.id), ErrorNotFound.httpCode);
	});

	test('should not list items from another share in a published notebook', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share: otherShare } = await shareFolderWithUser(session2.id, session1.id, '000000000000000000000000000000F2', [
			{ id: '000000000000000000000000000000F2', children: [] },
		]);

		await createFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session1.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'Owner note' });

		const share = await postApi<Share>(session1.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		await createNote(session2.id, { id: '00000000000000000000000000000009', parent_id: '000000000000000000000000000000F1', share_id: otherShare.id, title: 'Planted note' });
		await models().share().updateSharedItems3();
		expect(await models().item().loadByJopId(user1.id, '00000000000000000000000000000009')).toBeTruthy();

		const bodyHtml = await getShareContent(share.id) as string;
		expect(bodyHtml).toContain('Owner note');
		expect(bodyHtml).not.toContain('Planted note');
		expect(await getShareContent(share.id, { note_id: '00000000000000000000000000000009' })).not.toContain('Planted note');
	});

	test('should list items added by other members when the published notebook is shared', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share: folderShare } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [{ id: '00000000000000000000000000000001', title: 'Owner note' }],
			},
		]);

		const share = await postApi<Share>(session1.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		await createNote(session2.id, { id: '00000000000000000000000000000002', parent_id: '000000000000000000000000000000F1', share_id: folderShare.id, title: 'Member note' });
		await models().share().updateSharedItems3();

		const bodyHtml = await getShareContent(share.id) as string;
		expect(bodyHtml).toContain('Owner note');
		expect(bodyHtml).toContain('Member note');
	});

	test('should not let another account add links to a published note by uploading an item with a linked id', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const privateResource = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'private');
		const privateNote = await createNote(session1.id, { id: '000000000000000000000000000000C1' });

		const rootNote = await createNote(session1.id, {
			id: '00000000000000000000000000000001',
			body: '[](:/000000000000000000000000000000C9)',
		});

		const share = await postApi<Share>(session1.id, 'shares', {
			type: ShareType.Note,
			note_id: rootNote.jop_id,
			recursive: 1,
		});

		await createNote(session2.id, {
			id: '000000000000000000000000000000C9',
			body: `![](:/${privateResource.jop_id}) [](:/${privateNote.jop_id})`,
		});

		await expectHttpError(async () => getShareContent(share.id, { resource_id: privateResource.jop_id }), ErrorNotFound.httpCode);
		await expectHttpError(async () => getShareContent(share.id, { note_id: privateNote.jop_id }), ErrorNotFound.httpCode);
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

	test('should load the published folder contents only when they have changed', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'First title' });
		await createNote(session.id, { id: '00000000000000000000000000000002', parent_id: '000000000000000000000000000000F1', title: 'Other note' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const loadWithContent = jest.spyOn(ItemModel.prototype, 'loadWithContent');
		const now = jest.spyOn(Date, 'now');
		try {
			expect(await getShareContent(share.id)).toContain('First title');
			loadWithContent.mockClear();

			// Only the shared folder item itself is loaded again
			expect(await getShareContent(share.id)).toContain('First title');
			expect(loadWithContent).toHaveBeenCalledTimes(1);

			await updateNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'Second title' });
			const later = Date.now() + 60 * 1000;
			now.mockReturnValue(later);
			loadWithContent.mockClear();

			// The shared folder item, and only the note that changed
			expect(await getShareContent(share.id)).toContain('Second title');
			expect(loadWithContent).toHaveBeenCalledTimes(2);
		} finally {
			loadWithContent.mockRestore();
			now.mockRestore();
		}
	});

	test('should build a published folder once for concurrent requests', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'My Note' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const loadWithContent = jest.spyOn(ItemModel.prototype, 'loadWithContent');
		try {
			await Promise.all([getShareContent(share.id), getShareContent(share.id), getShareContent(share.id)]);

			// Each request loads the shared folder item, and the tree is built once, from the folder and its note
			expect(loadWithContent).toHaveBeenCalledTimes(5);
		} finally {
			loadWithContent.mockRestore();
		}
	});

	test('should refuse a published folder in the trash without loading its contents', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'My Note' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const trashedFolder = makeFolderSerializedBody({ id: '000000000000000000000000000000F1', title: 'My Notebook' }).replace('deleted_time: 0', `deleted_time: ${Date.now()}`);
		await updateItem(session.id, 'root:/000000000000000000000000000000F1.md:', trashedFolder);

		const loadByJopParentId = jest.spyOn(ItemModel.prototype, 'loadByJopParentId');
		try {
			await expectHttpError(async () => getShareContent(share.id), ErrorNotFound.httpCode);
			expect(loadByJopParentId).not.toHaveBeenCalled();
		} finally {
			loadByJopParentId.mockRestore();
		}
	});

	test('should serve a cached published folder while it is being refreshed', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: 'First title' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		expect(await getShareContent(share.id)).toContain('First title');

		// The refresh is held up, as by other refreshes that are slow
		let releaseRefresh: ()=> void = null;
		const refreshBlocked = new Promise<void>(resolve => {
			releaseRefresh = resolve;
		});
		const loadByJopParentId = ItemModel.prototype.loadByJopParentId;
		const loadChildren = jest.spyOn(ItemModel.prototype, 'loadByJopParentId').mockImplementation(async function(this: ItemModel, ...args: Parameters<ItemModel['loadByJopParentId']>) {
			await refreshBlocked;
			return loadByJopParentId.apply(this, args);
		});
		const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 30 * 1000);

		try {
			expect(await getShareContent(share.id)).toContain('First title');
		} finally {
			releaseRefresh();
			loadChildren.mockRestore();
			now.mockRestore();
		}
	});

	test('should link to the attachments of an HTML note through the share it is viewed from', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		const resource = await createResource(session.id, { id: '000000000000000000000000000000E1', mime: 'image/png', file_extension: 'png' }, 'test');
		const noteBody = makeNoteSerializedBody({ id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', body: `<img src=":/${resource.jop_id}"/>` }).replace('markup_language: 1', 'markup_language: 2');
		await createItem(session.id, 'root:/00000000000000000000000000000001.md:', noteBody);

		const folderShare = await postApi<Share>(session.id, 'shares', { folder_id: '000000000000000000000000000000F1', type: ShareType.PublishedFolder });
		const noteShare = await postApi<Share>(session.id, 'shares', { note_id: '00000000000000000000000000000001', type: ShareType.Note });

		expect(await getShareContent(folderShare.id, { note_id: '00000000000000000000000000000001' })).toContain(`shares/${folderShare.id}?resource_id=${resource.jop_id}`);
		expect(await getShareContent(noteShare.id)).toContain(`shares/${noteShare.id}?resource_id=${resource.jop_id}`);
	});

	test('should shorten long note titles in the published folder tree', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Notebook' });
		await createNote(session.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', title: `start${'x'.repeat(1000)}` });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const bodyHtml = await getShareContent(share.id) as string;
		expect(bodyHtml).toContain(`start${'x'.repeat(192)}...`);
		expect(bodyHtml).not.toContain('x'.repeat(196));
	});

	test('should display a published folder whose sub-folder is also its parent', async () => {
		const { session } = await createUserAndSession();

		await createFolder(session.id, { id: '000000000000000000000000000000F1', parent_id: '000000000000000000000000000000F2', title: 'My Notebook' });
		await createFolder(session.id, { id: '000000000000000000000000000000F2', parent_id: '000000000000000000000000000000F1', title: 'Sub-notebook' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		expect(await getShareContent(share.id)).toContain('Sub-notebook');
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
