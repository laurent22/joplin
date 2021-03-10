import { NoteEntity } from '@joplin/lib/services/database/types';
import routeHandler from '../../middleware/routeHandler';
import { putFileContent, testFilePath, postDirectory } from '../../utils/testing/fileApiUtils';
import { postShare } from '../../utils/testing/shareApiUtils';
import { beforeAllDb, afterAllTests, parseHtml, beforeEachDb, createUserAndSession, createFile, koaAppContext, checkContextError, expectNotThrow } from '../../utils/testing/testUtils';

function makeNoteSerializedBody(note: NoteEntity): string {
	return `${'title' in note ? note.title : 'Title'}

${'body' in note ? note.body : 'Body'}

id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
parent_id: e98f305dde8b47b793f031cf883324ff
created_time: 2020-10-15T10:34:16.044Z
updated_time: 2021-01-28T23:10:30.054Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author: 
source_url: 
is_todo: 1
todo_due: 1602760405000
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2020-10-15T10:34:16.044Z
user_updated_time: 2020-10-19T17:21:03.394Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 1
type_: 1`;
}

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

describe('shares.joplin', function() {

	beforeAll(async () => {
		await beforeAllDb('shares.joplin');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should display a simple note', async function() {
		const { user, session } = await createUserAndSession();

		await createFile(user.id, 'root:/b39dadd7a63742bebf3125fd2a9286d4.md:', makeNoteSerializedBody({
			title: 'Testing title',
			body: 'Testing body',
		}));

		const share = await postShare(session.id, 'root:/b39dadd7a63742bebf3125fd2a9286d4.md:');

		const bodyHtml = await getShareContent(share.id);

		// Check that a few important strings are present
		expect(bodyHtml).toContain('rendered-md'); // Means we have the HTML body
		expect(bodyHtml).toContain('Testing title'); // Means the note has been rendered
		expect(bodyHtml).toContain('Testing body');
	});

	test('should load plugins', async function() {
		const { user, session } = await createUserAndSession();

		await createFile(user.id, 'root:/b39dadd7a63742bebf3125fd2a9286d4.md:', makeNoteSerializedBody({
			body: '$\\sqrt{3x-1}+(1+x)^2$',
		}));

		const share = await postShare(session.id, 'root:/b39dadd7a63742bebf3125fd2a9286d4.md:');

		const bodyHtml = await getShareContent(share.id);

		expect(bodyHtml).toContain('class="katex-mathml"');
	});

	test('should render attached images', async function() {
		const { user, session } = await createUserAndSession();

		await createFile(user.id, 'root:/b39dadd7a63742bebf3125fd2a9286d4.md:', makeNoteSerializedBody({
			body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
		}));
		await postDirectory(session.id, 'root', '.resource');
		await putFileContent(session.id, 'root:/.resource/96765a68655f4446b3dbad7d41b6566e:', testFilePath());
		await createFile(user.id, 'root:/96765a68655f4446b3dbad7d41b6566e.md:', resourceContents.image);

		const share = await postShare(session.id, 'root:/b39dadd7a63742bebf3125fd2a9286d4.md:');

		const bodyHtml = await getShareContent(share.id) as string;

		// We should get an image like this:
		//
		// <img data-from-md data-resource-id="96765a68655f4446b3dbad7d41b6566e" src="http://localhost:22300/shares/TJsBi9Is1SsJXPRw5MW9HkItiq0PDu6x?resource_id=96765a68655f4446b3dbad7d41b6566e&amp;t=1602758278090" title=""/>

		const doc = parseHtml(bodyHtml);
		const image = doc.querySelector('img[data-resource-id="96765a68655f4446b3dbad7d41b6566e"]');
		expect(image.getAttribute('src')).toBe(`http://localhost:22300/shares/${share.id}?resource_id=96765a68655f4446b3dbad7d41b6566e&t=1602758278090`);

		// If we try to get the resource, via the share link, we should get full
		// image.
		const resourceContent = await getShareContent(share.id, {
			resource_id: '96765a68655f4446b3dbad7d41b6566e',
			t: '1602758278090',
		}) as Buffer;

		expect(resourceContent.byteLength).toBe(resourceSize);
	});

	test('should not throw an error if the note contains links to non-existing items', async function() {
		const { user, session } = await createUserAndSession();

		{
			const noteId = 'b39dadd7a63742bebf3125fd2a9286d4';
			await createFile(user.id, `root:/${noteId}.md:`, makeNoteSerializedBody({
				body: '![missing](:/531a2a839a2c493a88c45e39c6cb9ed4)',
			}));
			const share = await postShare(session.id, `root:/${noteId}.md:`);
			await expectNotThrow(async () => getShareContent(share.id));
		}

		{
			const noteId = 'b39dadd7a63742bebf3125fd2a9286d5';
			await createFile(user.id, `root:/${noteId}.md:`, makeNoteSerializedBody({
				body: '[missing too](:/531a2a839a2c493a88c45e39c6cb9ed4)',
			}));
			const share = await postShare(session.id, `root:/${noteId}.md:`);
			await expectNotThrow(async () => getShareContent(share.id));
		}
	});

});
