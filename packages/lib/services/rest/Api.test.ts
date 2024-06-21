import { PaginationOrderDir } from '../../models/utils/types';
import Api, { RequestMethod } from '../../services/rest/Api';
import { extractMediaUrls } from './routes/notes';
import shim from '../../shim';
import { setupDatabaseAndSynchronizer, switchClient, checkThrowAsync, db, msleep, supportDir } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Resource from '../../models/Resource';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import NoteTag from '../../models/NoteTag';
import ResourceService from '../../services/ResourceService';
import SearchEngine from '../search/SearchEngine';
const { MarkupToHtml } = require('@joplin/renderer');
import { ResourceEntity } from '../database/types';

const createFolderForPagination = async (num: number, time: number) => {
	await Folder.save({
		title: `folder${num}`,
		updated_time: time,
		created_time: time,
	}, { autoTimestamp: false });
};

const createNoteForPagination = async (numOrTitle: number | string, time: number) => {
	const title = typeof numOrTitle === 'string' ? numOrTitle : `note${numOrTitle}`;
	const body = typeof numOrTitle === 'string' ? `Note body ${numOrTitle}` : `noteBody${numOrTitle}`;

	await Note.save({
		title: title,
		body: body,
		updated_time: time,
		created_time: time,
	}, { autoTimestamp: false });
};

let api: Api = null;

describe('services/rest/Api', () => {

	beforeEach(async () => {
		api = new Api();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should ping', (async () => {
		const response = await api.route(RequestMethod.GET, 'ping');
		expect(response).toBe('JoplinClipperServer');
	}));

	it('should handle Not Found errors', (async () => {
		const hasThrown = await checkThrowAsync(async () => await api.route(RequestMethod.GET, 'pong'));
		expect(hasThrown).toBe(true);
	}));

	it('should get folders', (async () => {
		await Folder.save({ title: 'mon carnet' });
		const response = await api.route(RequestMethod.GET, 'folders');
		expect(response.items.length).toBe(1);
	}));

	it('should update folders', (async () => {
		const f1 = await Folder.save({ title: 'mon carnet' });
		await api.route(RequestMethod.PUT, `folders/${f1.id}`, null, JSON.stringify({
			title: 'modifié',
		}));

		const f1b = await Folder.load(f1.id);
		expect(f1b.title).toBe('modifié');
	}));

	it('should delete folders', (async () => {
		const f1 = await Folder.save({ title: 'mon carnet' });
		await api.route(RequestMethod.DELETE, `folders/${f1.id}`, { permanent: '1' });

		const f1b = await Folder.load(f1.id);
		expect(!f1b).toBe(true);
	}));

	it('should create folders', (async () => {
		const response = await api.route(RequestMethod.POST, 'folders', null, JSON.stringify({
			title: 'from api',
		}));

		expect(!!response.id).toBe(true);

		const f = await Folder.all();
		expect(f.length).toBe(1);
		expect(f[0].title).toBe('from api');
	}));

	it('should get one folder', (async () => {
		const f1 = await Folder.save({ title: 'mon carnet' });
		const response = await api.route(RequestMethod.GET, `folders/${f1.id}`);
		expect(response.id).toBe(f1.id);

		const hasThrown = await checkThrowAsync(async () => await api.route(RequestMethod.GET, 'folders/doesntexist'));
		expect(hasThrown).toBe(true);
	}));

	it('should get the folder notes', (async () => {
		const f1 = await Folder.save({ title: 'mon carnet' });
		const response2 = await api.route(RequestMethod.GET, `folders/${f1.id}/notes`);
		expect(response2.items.length).toBe(0);

		await Note.save({ title: 'un', parent_id: f1.id });
		await Note.save({ title: 'deux', parent_id: f1.id });
		const response = await api.route(RequestMethod.GET, `folders/${f1.id}/notes`);
		expect(response.items.length).toBe(2);
	}));

	it('should return folders as a tree', async () => {
		const folder1 = await Folder.save({ title: 'Folder 1' });
		await Folder.save({ title: 'Folder 2', parent_id: folder1.id });
		await Folder.save({ title: 'Folder 3', parent_id: folder1.id });

		const response = await api.route(RequestMethod.GET, 'folders', { as_tree: 1 });
		expect(response).toMatchObject([{
			title: 'Folder 1',
			id: folder1.id,
			children: [
				{ title: 'Folder 2' },
				{ title: 'Folder 3' },
			],
		}]);
	});

	it('should fail on invalid paths', (async () => {
		const hasThrown = await checkThrowAsync(async () => await api.route(RequestMethod.GET, 'schtroumpf'));
		expect(hasThrown).toBe(true);
	}));

	it('should get notes', (async () => {
		let response = null;
		const f1 = await Folder.save({ title: 'mon carnet' });
		const f2 = await Folder.save({ title: 'mon deuxième carnet' });
		const n1 = await Note.save({ title: 'un', parent_id: f1.id });
		await Note.save({ title: 'deux', parent_id: f1.id });
		const n3 = await Note.save({ title: 'trois', parent_id: f2.id });

		response = await api.route(RequestMethod.GET, 'notes');
		expect(response.items.length).toBe(3);

		response = await api.route(RequestMethod.GET, `notes/${n1.id}`);
		expect(response.id).toBe(n1.id);

		response = await api.route(RequestMethod.GET, `notes/${n3.id}`, { fields: 'id,title' });
		expect(Object.getOwnPropertyNames(response).length).toBe(3);
		expect(response.id).toBe(n3.id);
		expect(response.title).toBe('trois');
	}));

	it('should create notes', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
		}));
		expect(response.title).toBe('testing');
		expect(!!response.id).toBe(true);

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
		}));
		expect(response.title).toBe('testing');
		expect(!!response.id).toBe(true);
	}));

	it('should allow setting note properties', (async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let response: any = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
			latitude: '48.732071',
			longitude: '-3.458700',
			altitude: '21',
			source: 'testing',
		}));

		const noteId = response.id;

		{
			const note = await Note.load(noteId);
			expect(note.latitude).toBe('48.73207100');
			expect(note.longitude).toBe('-3.45870000');
			expect(note.altitude).toBe('21.0000');
			expect(note.source).toBe('testing');
		}

		await api.route(RequestMethod.PUT, `notes/${noteId}`, null, JSON.stringify({
			latitude: '49',
			longitude: '-3',
			altitude: '22',
			source: 'testing 2',
		}));

		{
			const note = await Note.load(noteId);
			expect(note.latitude).toBe('49.00000000');
			expect(note.longitude).toBe('-3.00000000');
			expect(note.altitude).toBe('22.0000');
			expect(note.source).toBe('testing 2');
		}
	}));

	it('should preserve user timestamps when creating notes', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		const updatedTime = Date.now() - 1000;
		const createdTime = Date.now() - 10000;

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			parent_id: f.id,
			user_updated_time: updatedTime,
			user_created_time: createdTime,
		}));

		expect(response.user_updated_time).toBe(updatedTime);
		expect(response.user_created_time).toBe(createdTime);

		const timeBefore = Date.now();

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			parent_id: f.id,
		}));

		const newNote = await Note.load(response.id);
		expect(newNote.user_updated_time).toBeGreaterThanOrEqual(timeBefore);
		expect(newNote.user_created_time).toBeGreaterThanOrEqual(timeBefore);
	}));

	it('should preserve user timestamps when updating notes', (async () => {
		const folder = await Folder.save({ title: 'mon carnet' });

		const updatedTime = Date.now() - 1000;
		const createdTime = Date.now() - 10000;

		const response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			parent_id: folder.id,
		}));

		const noteId = response.id;

		{
			// Check that if user timestamps are supplied, they are preserved by the API

			await api.route(RequestMethod.PUT, `notes/${noteId}`, null, JSON.stringify({
				user_updated_time: updatedTime,
				user_created_time: createdTime,
				title: 'mod',
			}));

			const modNote = await Note.load(noteId);
			expect(modNote.title).toBe('mod');
			expect(modNote.user_updated_time).toBe(updatedTime);
			expect(modNote.user_created_time).toBe(createdTime);
		}

		{
			// Check if no user timestamps are supplied they are automatically updated.

			const beforeTime = Date.now();

			await api.route(RequestMethod.PUT, `notes/${noteId}`, null, JSON.stringify({
				title: 'mod2',
			}));

			const modNote = await Note.load(noteId);
			expect(modNote.title).toBe('mod2');
			expect(modNote.user_updated_time).toBeGreaterThanOrEqual(beforeTime);
			expect(modNote.user_created_time).toBeGreaterThanOrEqual(createdTime);
		}
	}));

	it('should create notes with supplied ID', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			id: '12345678123456781234567812345678',
			title: 'testing',
			parent_id: f.id,
		}));
		expect(response.id).toBe('12345678123456781234567812345678');
	}));

	it('should create todos', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'stuff to do' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
			is_todo: 1,
		}));
		expect(response.is_todo).toBe(1);

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing 2',
			parent_id: f.id,
			is_todo: 0,
		}));
		expect(response.is_todo).toBe(0);

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing 3',
			parent_id: f.id,
		}));
		expect(response.is_todo).toBeUndefined();

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing 4',
			parent_id: f.id,
			is_todo: '1',
			todo_due: '2',
			todo_completed: '3',
		}));
		expect(response.todo_due).toBe(2);
		expect(response.todo_completed).toBe(3);
	}));

	it('should create folders with supplied ID', (async () => {
		const response = await api.route(RequestMethod.POST, 'folders', null, JSON.stringify({
			id: '12345678123456781234567812345678',
			title: 'from api',
		}));

		expect(response.id).toBe('12345678123456781234567812345678');
	}));

	it('should create notes with images', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing image',
			parent_id: f.id,
			image_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII=',
		}));

		const resources = await Resource.all();
		expect(resources.length).toBe(1);

		const resource = resources[0];
		expect(response.body.indexOf(resource.id) >= 0).toBe(true);
	}));

	it('should not compress images uploaded through resource API', (async () => {
		const originalImagePath = `${supportDir}/photo-large.png`;
		await api.route(RequestMethod.POST, 'resources', null, JSON.stringify({
			title: 'testing resource',
		}), [
			{
				path: originalImagePath,
			},
		]);

		const resources = await Resource.all();
		expect(resources.length).toBe(1);
		const uploadedImagePath = Resource.fullPath(resources[0]);

		const originalImageSize = (await shim.fsDriver().stat(originalImagePath)).size;
		const uploadedImageSize = (await shim.fsDriver().stat(uploadedImagePath)).size;

		expect(originalImageSize).toEqual(uploadedImageSize);
	}));

	it('should update a resource', (async () => {
		await api.route(RequestMethod.POST, 'resources', null, JSON.stringify({
			title: 'resource',
		}), [
			{
				path: `${supportDir}/photo.jpg`,
			},
		]);

		const resourceV1: ResourceEntity = (await Resource.all())[0];

		await msleep(1);

		await api.route(RequestMethod.PUT, `resources/${resourceV1.id}`, null, JSON.stringify({
			title: 'resource mod',
		}), [
			{
				path: `${supportDir}/photo-large.png`,
			},
		]);

		const resourceV2: ResourceEntity = (await Resource.all())[0];

		expect(resourceV2.title).toBe('resource mod');
		expect(resourceV2.mime).toBe('image/png');
		expect(resourceV2.file_extension).toBe('png');
		expect(resourceV2.updated_time).toBeGreaterThan(resourceV1.updated_time);
		expect(resourceV2.created_time).toBe(resourceV1.created_time);
		expect(resourceV2.size).toBeGreaterThan(resourceV1.size);

		expect(resourceV2.size).toBe((await shim.fsDriver().stat(Resource.fullPath(resourceV2))).size);
	}));

	it('should allow updating a resource file only', (async () => {
		await api.route(RequestMethod.POST, 'resources', null, JSON.stringify({
			title: 'resource',
		}), [{ path: `${supportDir}/photo.jpg` }]);

		const resourceV1: ResourceEntity = (await Resource.all())[0];

		await msleep(1);

		await api.route(RequestMethod.PUT, `resources/${resourceV1.id}`, null, null, [
			{
				path: `${supportDir}/photo-large.png`,
			},
		]);

		const resourceV2: ResourceEntity = (await Resource.all())[0];

		// It should have updated the file content, but not the metadata
		expect(resourceV2.title).toBe(resourceV1.title);
		expect(resourceV2.size).toBeGreaterThan(resourceV1.size);
	}));

	it('should update resource properties', (async () => {
		await api.route(RequestMethod.POST, 'resources', null, JSON.stringify({
			title: 'resource',
		}), [{ path: `${supportDir}/photo.jpg` }]);

		const resourceV1: ResourceEntity = (await Resource.all())[0];

		await msleep(1);

		await api.route(RequestMethod.PUT, `resources/${resourceV1.id}`, null, JSON.stringify({
			title: 'my new title',
		}));

		const resourceV2: ResourceEntity = (await Resource.all())[0];

		expect(resourceV2.title).toBe('my new title');
		expect(resourceV2.mime).toBe(resourceV1.mime);
	}));

	it('should delete resources', (async () => {
		const f = await Folder.save({ title: 'mon carnet' });

		await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing image',
			parent_id: f.id,
			image_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII=',
		}));

		const resource = (await Resource.all())[0];

		const filePath = Resource.fullPath(resource);
		expect(await shim.fsDriver().exists(filePath)).toBe(true);

		await api.route(RequestMethod.DELETE, `resources/${resource.id}`);
		expect(await shim.fsDriver().exists(filePath)).toBe(false);
		expect(!(await Resource.load(resource.id))).toBe(true);
	}));

	it('should create notes from HTML', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing HTML',
			parent_id: f.id,
			body_html: '<b>Bold text</b>',
		}));

		expect(response.body).toBe('**Bold text**');
	}));

	it('should extract media urls from body', (() => {
		const tests = [
			{
				language: MarkupToHtml.MARKUP_LANGUAGE_HTML,
				body: '<div> <img src="https://example.com/img.png" /> <embed src="https://example.com/sample.pdf"/> <object data="https://example.com/file.PDF"></object> </div>',
				result: ['https://example.com/img.png', 'https://example.com/sample.pdf', 'https://example.com/file.PDF'],
			},
			{
				language: MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
				body: 'test text \n ![img 1](https://example.com/img1.png) [embedded_pdf](https://example.com/sample1.pdf) [embedded_pdf](https://example.com/file.PDF)',
				result: ['https://example.com/img1.png', 'https://example.com/sample1.pdf', 'https://example.com/file.PDF'],
			},
			{
				language: MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
				body: '> <a id="attachment68076"></a>[![Enable or Disable Sync Your Settings in Windows 10-disabled_sync_your_settings.png](https://www.tenforums.com/attachments/tutorials/68076d1485964056t-enable-disable-sync-your-settings-windows-10-a-disabled_sync_your_settings.png?s=0bbd1c630a9a924f05134d51b4768d2b "Enable or Disable Sync Your Settings in Windows 10-disabled_sync_your_settings.png")](https://www.tenforums.com/attachments/tutorials/68076d1457326453-enable-disable-sync-your-settings-windows-10-a-disabled_sync_your_settings.png?s=0bbd1c630a9a924f05134d51b4768d2b)',
				result: ['https://www.tenforums.com/attachments/tutorials/68076d1485964056t-enable-disable-sync-your-settings-windows-10-a-disabled_sync_your_settings.png?s=0bbd1c630a9a924f05134d51b4768d2b'],
			},
			{
				language: MarkupToHtml.MARKUP_LANGUAGE_HTML,
				body: '<div> <embed src="https://example.com/sample"/> <embed /> <object data="https://example.com/file.pdfff"></object> <a href="https://test.com/file.pdf">Link</a> </div>',
				result: [],
			},
		];
		// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
		tests.forEach((test) => {
			const urls = extractMediaUrls(test.language, test.body);
			expect(urls).toEqual(test.result);
		});
	}));

	it('should create notes with pdf embeds', (async () => {
		let response = null;
		const f = await Folder.save({ title: 'pdf test1' });

		response = await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({
			title: 'testing PDF embeds',
			parent_id: f.id,
			body_html: `<div> <embed src="file://${supportDir}/welcome.pdf" type="application/pdf" /> </div>`,
		}));

		const resources = await Resource.all();
		expect(resources.length).toBe(1);

		const resource = resources[0];
		expect(response.body.indexOf(resource.id) >= 0).toBe(true);
	}));

	it('should handle tokens', (async () => {
		api = new Api('mytoken');

		let hasThrown = await checkThrowAsync(async () => await api.route(RequestMethod.GET, 'notes'));
		expect(hasThrown).toBe(true);

		const response = await api.route(RequestMethod.GET, 'notes', { token: 'mytoken' });
		expect(response.items.length).toBe(0);

		hasThrown = await checkThrowAsync(async () => await api.route(RequestMethod.POST, 'notes', null, JSON.stringify({ title: 'testing' })));
		expect(hasThrown).toBe(true);
	}));

	it('should add tags to notes', (async () => {
		const tag = await Tag.save({ title: 'mon étiquette' });
		const note = await Note.save({ title: 'ma note' });

		await api.route(RequestMethod.POST, `tags/${tag.id}/notes`, null, JSON.stringify({
			id: note.id,
		}));

		const noteIds = await Tag.noteIds(tag.id);
		expect(noteIds[0]).toBe(note.id);
	}));

	it('should remove tags from notes', (async () => {
		const tag = await Tag.save({ title: 'mon étiquette' });
		const note = await Note.save({ title: 'ma note' });
		await Tag.addNote(tag.id, note.id);

		await api.route(RequestMethod.DELETE, `tags/${tag.id}/notes/${note.id}`);

		const noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.length).toBe(0);
	}));

	it('should list all tag notes', (async () => {
		const tag = await Tag.save({ title: 'mon étiquette' });
		const tag2 = await Tag.save({ title: 'mon étiquette 2' });
		const note1 = await Note.save({ title: 'ma note un' });
		const note2 = await Note.save({ title: 'ma note deux' });
		await Tag.addNote(tag.id, note1.id);
		await Tag.addNote(tag.id, note2.id);

		const response = await api.route(RequestMethod.GET, `tags/${tag.id}/notes`);
		expect(response.items.length).toBe(2);
		expect('id' in response.items[0]).toBe(true);
		expect('title' in response.items[0]).toBe(true);

		const response2 = await api.route(RequestMethod.GET, `notes/${note1.id}/tags`);
		expect(response2.items.length).toBe(1);
		await Tag.addNote(tag2.id, note1.id);
		const response3 = await api.route(RequestMethod.GET, `notes/${note1.id}/tags`, { fields: 'id' });
		expect(response3.items.length).toBe(2);

		// Also check that it only returns the required fields
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		response3.items.sort((a: any, b: any) => {
			return a.id < b.id ? -1 : +1;
		});

		const sortedTagIds = [tag.id, tag2.id];
		sortedTagIds.sort();

		expect(JSON.stringify(response3.items)).toBe(`[{"id":"${sortedTagIds[0]}"},{"id":"${sortedTagIds[1]}"}]`);
	}));

	it('should update tags when updating notes', (async () => {
		const tag1 = await Tag.save({ title: 'mon étiquette 1' });
		const tag2 = await Tag.save({ title: 'mon étiquette 2' });
		const tag3 = await Tag.save({ title: 'mon étiquette 3' });

		const note = await Note.save({
			title: 'ma note un',
		});
		await Tag.addNote(tag1.id, note.id);
		await Tag.addNote(tag2.id, note.id);

		const response = await api.route(RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
			tags: `${tag1.title},${tag3.title}`,
		}));
		const tagIds = await NoteTag.tagIdsByNoteId(note.id);
		expect(response.tags === `${tag1.title},${tag3.title}`).toBe(true);
		expect(tagIds.length === 2).toBe(true);
		expect(tagIds.includes(tag1.id)).toBe(true);
		expect(tagIds.includes(tag3.id)).toBe(true);
	}));

	it('should create and update tags when updating notes', (async () => {
		const tag1 = await Tag.save({ title: 'mon étiquette 1' });
		const tag2 = await Tag.save({ title: 'mon étiquette 2' });
		const newTagTitle = 'mon étiquette 3';

		const note = await Note.save({
			title: 'ma note un',
		});
		await Tag.addNote(tag1.id, note.id);
		await Tag.addNote(tag2.id, note.id);

		const response = await api.route(RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
			tags: `${tag1.title},${newTagTitle}`,
		}));
		const newTag = await Tag.loadByTitle(newTagTitle);
		const tagIds = await NoteTag.tagIdsByNoteId(note.id);
		expect(response.tags === `${tag1.title},${newTag.title}`).toBe(true);
		expect(tagIds.length === 2).toBe(true);
		expect(tagIds.includes(tag1.id)).toBe(true);
		expect(tagIds.includes(newTag.id)).toBe(true);
	}));

	it('should not update tags if tags is not mentioned when updating', (async () => {
		const tag1 = await Tag.save({ title: 'mon étiquette 1' });
		const tag2 = await Tag.save({ title: 'mon étiquette 2' });

		const note = await Note.save({
			title: 'ma note un',
		});
		await Tag.addNote(tag1.id, note.id);
		await Tag.addNote(tag2.id, note.id);

		const response = await api.route(RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
			title: 'Some other title',
		}));
		const tagIds = await NoteTag.tagIdsByNoteId(note.id);
		expect(response.tags === undefined).toBe(true);
		expect(tagIds.length === 2).toBe(true);
		expect(tagIds.includes(tag1.id)).toBe(true);
		expect(tagIds.includes(tag2.id)).toBe(true);
	}));

	it('should remove tags from note if tags is set to empty string when updating', (async () => {
		const tag1 = await Tag.save({ title: 'mon étiquette 1' });
		const tag2 = await Tag.save({ title: 'mon étiquette 2' });

		const note = await Note.save({
			title: 'ma note un',
		});
		await Tag.addNote(tag1.id, note.id);
		await Tag.addNote(tag2.id, note.id);

		const response = await api.route(RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
			tags: '',
		}));
		const tagIds = await NoteTag.tagIdsByNoteId(note.id);
		expect(response.tags === '').toBe(true);
		expect(tagIds.length === 0).toBe(true);
	}));

	it('should paginate results', (async () => {
		await createFolderForPagination(1, 1001);
		await createFolderForPagination(2, 1002);
		await createFolderForPagination(3, 1003);
		await createFolderForPagination(4, 1004);

		{
			const baseQuery = {
				fields: ['id', 'title', 'updated_time'],
				limit: 2,
				order_dir: PaginationOrderDir.ASC,
				order_by: 'updated_time',
			};

			const r1 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery });

			expect(r1.has_more).toBe(true);
			expect(r1.items.length).toBe(2);
			expect(r1.items[0].title).toBe('folder1');
			expect(r1.items[1].title).toBe('folder2');

			const r2 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery, page: 2 });

			// The API currently doesn't check if there's effectively a
			// page of data after the current one. If the number of
			// returned items === limit, it sets `has_more` and the next
			// result set will be empty
			expect(r1.has_more).toBe(true);
			expect(r2.items.length).toBe(2);
			expect(r2.items[0].title).toBe('folder3');
			expect(r2.items[1].title).toBe('folder4');

			const r3 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery, page: 3 });

			expect(r3.items.length).toBe(0);
			expect(r3.has_more).toBe(false);
		}

		{
			const baseQuery = {
				fields: ['id', 'title', 'updated_time'],
				limit: 3,
				order_dir: PaginationOrderDir.ASC,
				order_by: 'updated_time',
			};

			const r1 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery });

			expect(r1.items.length).toBe(3);
			expect(r1.items[0].title).toBe('folder1');
			expect(r1.items[1].title).toBe('folder2');
			expect(r1.items[2].title).toBe('folder3');

			const r2 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery, page: 2 });

			expect(r2.items.length).toBe(1);
			expect(r2.items[0].title).toBe('folder4');
			expect(r2.has_more).toBe(false);
		}
	}));

	it('should paginate results and handle duplicate field values', (async () => {
		// If, for example, ordering by updated_time, and two of the rows
		// have the same updated_time, it should make sure that the sort
		// order is stable and all results are correctly returned.
		await createFolderForPagination(1, 1001);
		await createFolderForPagination(2, 1002);
		await createFolderForPagination(3, 1002);
		await createFolderForPagination(4, 1003);

		const baseQuery = {
			fields: ['id', 'title', 'updated_time'],
			limit: 2,
			order_dir: PaginationOrderDir.ASC,
			order_by: 'updated_time',
		};

		const r1 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery });

		expect(r1.items.length).toBe(2);
		expect(r1.items[0].title).toBe('folder1');
		expect(['folder2', 'folder3'].includes(r1.items[1].title)).toBe(true);

		const r2 = await api.route(RequestMethod.GET, 'folders', { ...baseQuery, page: 2 });

		expect(r2.items.length).toBe(2);
		expect(r2.items[0].title).toBe(r1.items[1].title === 'folder2' ? 'folder3' : 'folder2');
		expect(r2.items[1].title).toBe('folder4');
	}));

	it('should paginate results and return the requested fields only', (async () => {
		await createNoteForPagination(1, 1001);
		await createNoteForPagination(2, 1002);
		await createNoteForPagination(3, 1003);

		const baseQuery = {
			fields: ['id', 'title', 'body'],
			limit: 2,
			order_dir: PaginationOrderDir.ASC,
			order_by: 'updated_time',
		};

		const r1 = await api.route(RequestMethod.GET, 'notes', { ...baseQuery });

		expect(Object.keys(r1.items[0]).sort().join(',')).toBe('body,id,title');
		expect(r1.items.length).toBe(2);
		expect(r1.items[0].title).toBe('note1');
		expect(r1.items[0].body).toBe('noteBody1');
		expect(r1.items[1].title).toBe('note2');
		expect(r1.items[1].body).toBe('noteBody2');

		const r2 = await api.route(RequestMethod.GET, 'notes', { ...baseQuery, fields: ['id'], page: 2 });

		expect(Object.keys(r2.items[0]).sort().join(',')).toBe('id');
		expect(r2.items.length).toBe(1);
		expect(!!r2.items[0].id).toBe(true);
	}));

	it('should paginate folder notes', (async () => {
		const folder = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder.id });
		await msleep(1);
		const note2 = await Note.save({ parent_id: folder.id });
		await msleep(1);
		const note3 = await Note.save({ parent_id: folder.id });

		const r1 = await api.route(RequestMethod.GET, `folders/${folder.id}/notes`, {
			limit: 2,
		});

		expect(r1.items.length).toBe(2);
		expect(r1.items[0].id).toBe(note1.id);
		expect(r1.items[1].id).toBe(note2.id);

		const r2 = await api.route(RequestMethod.GET, `folders/${folder.id}/notes`, {
			limit: 2,
			page: 2,
		});

		expect(r2.items.length).toBe(1);
		expect(r2.items[0].id).toBe(note3.id);
	}));

	it('should sort search paginated results', (async () => {
		SearchEngine.instance().setDb(db());

		await createNoteForPagination('note c', 1000);
		await createNoteForPagination('note e', 1001);
		await createNoteForPagination('note b', 1002);
		await createNoteForPagination('note a', 1003);
		await createNoteForPagination('note d', 1004);

		await SearchEngine.instance().syncTables();

		{
			const baseQuery = {
				query: 'note',
				fields: ['id', 'title', 'updated_time'],
				limit: 3,
				order_dir: PaginationOrderDir.ASC,
				order_by: 'updated_time',
			};

			const r1 = await api.route(RequestMethod.GET, 'search', baseQuery);
			expect(r1.items[0].updated_time).toBe(1000);
			expect(r1.items[1].updated_time).toBe(1001);
			expect(r1.items[2].updated_time).toBe(1002);

			const r2 = await api.route(RequestMethod.GET, 'search', { ...baseQuery, page: 2 });
			expect(r2.items[0].updated_time).toBe(1003);
			expect(r2.items[1].updated_time).toBe(1004);
		}

		{
			const baseQuery = {
				query: 'note',
				fields: ['id', 'title', 'updated_time'],
				limit: 2,
				order_dir: PaginationOrderDir.DESC,
				order_by: 'title',
			};

			const r1 = await api.route(RequestMethod.GET, 'search', baseQuery);
			expect(r1.items[0].title).toBe('note e');
			expect(r1.items[1].title).toBe('note d');

			const r2 = await api.route(RequestMethod.GET, 'search', { ...baseQuery, page: 2 });
			expect(r2.items[0].title).toBe('note c');
			expect(r2.items[1].title).toBe('note b');

			const r3 = await api.route(RequestMethod.GET, 'search', { ...baseQuery, page: 3 });
			expect(r3.items[0].title).toBe('note a');
		}
	}));

	it('should return default fields', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		await Note.save({ title: 'note2', parent_id: folder.id });

		const tag = await Tag.save({ title: 'tag' });
		await Tag.addNote(tag.id, note1.id);

		{
			const r = await api.route(RequestMethod.GET, `folders/${folder.id}`);
			expect('id' in r).toBe(true);
			expect('title' in r).toBe(true);
			expect('parent_id' in r).toBe(true);
		}

		{
			const r = await api.route(RequestMethod.GET, `folders/${folder.id}/notes`);
			expect('id' in r.items[0]).toBe(true);
			expect('title' in r.items[0]).toBe(true);
			expect('parent_id' in r.items[0]).toBe(true);
		}

		{
			const r = await api.route(RequestMethod.GET, 'notes');
			expect('id' in r.items[0]).toBe(true);
			expect('title' in r.items[0]).toBe(true);
			expect('parent_id' in r.items[0]).toBe(true);
		}

		{
			const r = await api.route(RequestMethod.GET, `notes/${note1.id}/tags`);
			expect('id' in r.items[0]).toBe(true);
			expect('title' in r.items[0]).toBe(true);
		}

		{
			const r = await api.route(RequestMethod.GET, `tags/${tag.id}`);
			expect('id' in r).toBe(true);
			expect('title' in r).toBe(true);
		}
	}));

	it('should return the notes associated with a resource', (async () => {
		const note = await Note.save({});
		await shim.attachFileToNote(note, `${supportDir}/photo.jpg`);
		const resource = (await Resource.all())[0];

		const resourceService = new ResourceService();
		await resourceService.indexNoteResources();

		const r = await api.route(RequestMethod.GET, `resources/${resource.id}/notes`);

		expect(r.items.length).toBe(1);
		expect(r.items[0].id).toBe(note.id);
	}));

	it('should return the resources associated with a note', (async () => {
		const note = await Note.save({});
		await shim.attachFileToNote(note, `${supportDir}/photo.jpg`);
		const resource = (await Resource.all())[0];

		const r = await api.route(RequestMethod.GET, `notes/${note.id}/resources`);

		expect(r.items.length).toBe(1);
		expect(r.items[0].id).toBe(resource.id);
	}));

	it('should return search results', (async () => {
		SearchEngine.instance().setDb(db());

		for (let i = 0; i < 10; i++) {
			await Note.save({ title: 'a' });
		}

		await SearchEngine.instance().syncTables();

		// Mostly testing pagination below

		const r1 = await api.route(RequestMethod.GET, 'search', { query: 'a', limit: 4 });
		expect(r1.items.length).toBe(4);
		expect(r1.has_more).toBe(true);

		const r2 = await api.route(RequestMethod.GET, 'search', { query: 'a', limit: 4, page: 2 });
		expect(r2.items.length).toBe(4);
		expect(r2.has_more).toBe(true);

		const r3 = await api.route(RequestMethod.GET, 'search', { query: 'a', limit: 4, page: 3 });
		expect(r3.items.length).toBe(2);
		expect(!!r3.has_more).toBe(false);

		await SearchEngine.instance().destroy();

	}));
});
