/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest, setupDatabaseAndSynchronizer, switchClient, checkThrowAsync } = require('test-utils.js');
const Api = require('lib/services/rest/Api');
const Folder = require('lib/models/Folder');
const Resource = require('lib/models/Resource');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const { shim } = require('lib/shim');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

let api = null;

describe('services_rest_Api', function() {

	beforeEach(async (done) => {
		api = new Api();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should ping', asyncTest(async () => {
		const response = await api.route('GET', 'ping');
	}));

	it('should handle Not Found errors', asyncTest(async () => {
		const hasThrown = await checkThrowAsync(async () => await api.route('GET', 'pong'));
	}));

	it('should get folders', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'mon carnet' });
		const response = await api.route('GET', 'folders');
		expect(response.length).toBe(1);
	}));

	it('should update folders', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'mon carnet' });
		const response = await api.route('PUT', `folders/${f1.id}`, null, JSON.stringify({
			title: 'modifié',
		}));

		let f1b = await Folder.load(f1.id);
		expect(f1b.title).toBe('modifié');
	}));

	it('should delete folders', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'mon carnet' });
		await api.route('DELETE', `folders/${f1.id}`);

		let f1b = await Folder.load(f1.id);
		expect(!f1b).toBe(true);
	}));

	it('should create folders', asyncTest(async () => {
		const response = await api.route('POST', 'folders', null, JSON.stringify({
			title: 'from api',
		}));

		expect(!!response.id).toBe(true);

		let f = await Folder.all();
		expect(f.length).toBe(1);
		expect(f[0].title).toBe('from api');
	}));

	it('should get one folder', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'mon carnet' });
		const response = await api.route('GET', `folders/${f1.id}`);
		expect(response.id).toBe(f1.id);

		const hasThrown = await checkThrowAsync(async () => await api.route('GET', 'folders/doesntexist'));
		expect(hasThrown).toBe(true);
	}));

	it('should get the folder notes', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'mon carnet' });
		const response2 = await api.route('GET', `folders/${f1.id}/notes`);
		expect(response2.length).toBe(0);

		const n1 = await Note.save({ title: 'un', parent_id: f1.id });
		const n2 = await Note.save({ title: 'deux', parent_id: f1.id });
		const response = await api.route('GET', `folders/${f1.id}/notes`);
		expect(response.length).toBe(2);
	}));

	it('should fail on invalid paths', asyncTest(async () => {
		const hasThrown = await checkThrowAsync(async () => await api.route('GET', 'schtroumpf'));
		expect(hasThrown).toBe(true);
	}));

	it('should get notes', asyncTest(async () => {
		let response = null;
		const f1 = await Folder.save({ title: 'mon carnet' });
		const f2 = await Folder.save({ title: 'mon deuxième carnet' });
		const n1 = await Note.save({ title: 'un', parent_id: f1.id });
		const n2 = await Note.save({ title: 'deux', parent_id: f1.id });
		const n3 = await Note.save({ title: 'trois', parent_id: f2.id });

		response = await api.route('GET', 'notes');
		expect(response.length).toBe(3);

		response = await api.route('GET', `notes/${n1.id}`);
		expect(response.id).toBe(n1.id);

		response = await api.route('GET', `notes/${n3.id}`, { fields: 'id,title' });
		expect(Object.getOwnPropertyNames(response).length).toBe(3);
		expect(response.id).toBe(n3.id);
		expect(response.title).toBe('trois');
	}));

	it('should create notes', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
		}));
		expect(response.title).toBe('testing');
		expect(!!response.id).toBe(true);

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
		}));
		expect(response.title).toBe('testing');
		expect(!!response.id).toBe(true);
	}));

	it('should preserve user timestamps when creating notes', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		const updatedTime = Date.now() - 1000;
		const createdTime = Date.now() - 10000;

		response = await api.route('POST', 'notes', null, JSON.stringify({
			parent_id: f.id,
			user_updated_time: updatedTime,
			user_created_time: createdTime,
		}));

		expect(response.user_updated_time).toBe(updatedTime);
		expect(response.user_created_time).toBe(createdTime);
	}));

	it('should create notes with supplied ID', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route('POST', 'notes', null, JSON.stringify({
			id: '12345678123456781234567812345678',
			title: 'testing',
			parent_id: f.id,
		}));
		expect(response.id).toBe('12345678123456781234567812345678');
	}));

	it('should create todos', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'stuff to do' });

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing',
			parent_id: f.id,
			is_todo: 1,
		}));
		expect(response.is_todo).toBe(1);

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing 2',
			parent_id: f.id,
			is_todo: 0,
		}));
		expect(response.is_todo).toBe(0);

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing 3',
			parent_id: f.id,
		}));
		expect(response.is_todo).toBeUndefined();

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing 4',
			parent_id: f.id,
			is_todo: '1',
		}));
	}));

	it('should create folders with supplied ID', asyncTest(async () => {
		const response = await api.route('POST', 'folders', null, JSON.stringify({
			id: '12345678123456781234567812345678',
			title: 'from api',
		}));

		expect(response.id).toBe('12345678123456781234567812345678');
	}));

	it('should create notes with images', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing image',
			parent_id: f.id,
			image_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII=',
		}));

		const resources = await Resource.all();
		expect(resources.length).toBe(1);

		const resource = resources[0];
		expect(response.body.indexOf(resource.id) >= 0).toBe(true);
	}));

	it('should delete resources', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing image',
			parent_id: f.id,
			image_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII=',
		}));

		const resource = (await Resource.all())[0];

		const filePath = Resource.fullPath(resource);
		expect(await shim.fsDriver().exists(filePath)).toBe(true);

		await api.route('DELETE', `resources/${resource.id}`);
		expect(await shim.fsDriver().exists(filePath)).toBe(false);
		expect(!(await Resource.load(resource.id))).toBe(true);
	}));

	it('should create notes from HTML', asyncTest(async () => {
		let response = null;
		const f = await Folder.save({ title: 'mon carnet' });

		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing HTML',
			parent_id: f.id,
			body_html: '<b>Bold text</b>',
		}));

		expect(response.body).toBe('**Bold text**');
	}));

	it('should filter fields', asyncTest(async () => {
		let f = api.fields_({ query: { fields: 'one,two' } }, []);
		expect(f.length).toBe(2);
		expect(f[0]).toBe('one');
		expect(f[1]).toBe('two');

		f = api.fields_({ query: { fields: 'one  ,, two  ' } }, []);
		expect(f.length).toBe(2);
		expect(f[0]).toBe('one');
		expect(f[1]).toBe('two');

		f = api.fields_({ query: { fields: '  ' } }, ['def']);
		expect(f.length).toBe(1);
		expect(f[0]).toBe('def');
	}));

	it('should handle tokens', asyncTest(async () => {
		api = new Api('mytoken');

		let hasThrown = await checkThrowAsync(async () => await api.route('GET', 'notes'));
		expect(hasThrown).toBe(true);

		const response = await api.route('GET', 'notes', { token: 'mytoken' });
		expect(response.length).toBe(0);

		hasThrown = await checkThrowAsync(async () => await api.route('POST', 'notes', null, JSON.stringify({ title: 'testing' })));
		expect(hasThrown).toBe(true);
	}));

	it('should add tags to notes', asyncTest(async () => {
		const tag = await Tag.save({ title: 'mon étiquette' });
		const note = await Note.save({ title: 'ma note' });

		const response = await api.route('POST', `tags/${tag.id}/notes`, null, JSON.stringify({
			id: note.id,
		}));

		const noteIds = await Tag.noteIds(tag.id);
		expect(noteIds[0]).toBe(note.id);
	}));

	it('should remove tags from notes', asyncTest(async () => {
		const tag = await Tag.save({ title: 'mon étiquette' });
		const note = await Note.save({ title: 'ma note' });
		await Tag.addNote(tag.id, note.id);

		const response = await api.route('DELETE', `tags/${tag.id}/notes/${note.id}`);

		const noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.length).toBe(0);
	}));

	it('should list all tag notes', asyncTest(async () => {
		const tag = await Tag.save({ title: 'mon étiquette' });
		const tag2 = await Tag.save({ title: 'mon étiquette 2' });
		const note1 = await Note.save({ title: 'ma note un' });
		const note2 = await Note.save({ title: 'ma note deux' });
		await Tag.addNote(tag.id, note1.id);
		await Tag.addNote(tag.id, note2.id);

		const response = await api.route('GET', `tags/${tag.id}/notes`);
		expect(response.length).toBe(2);
		expect('id' in response[0]).toBe(true);
		expect('title' in response[0]).toBe(true);

		const response2 = await api.route('GET', `notes/${note1.id}/tags`);
		expect(response2.length).toBe(1);
		await Tag.addNote(tag2.id, note1.id);
		const response3 = await api.route('GET', `notes/${note1.id}/tags`);
		expect(response3.length).toBe(2);
	}));

});
