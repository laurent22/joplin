require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const markdownUtils = require('lib/markdownUtils.js');
const Api = require('lib/services/rest/Api');
const Folder = require('lib/models/Folder');
const Resource = require('lib/models/Resource');

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

	it('should ping', async (done) => {
		const response = await api.route('GET', 'ping');
		expect(response).toBe('JoplinClipperServer');
		done();
	});

	it('should handle Not Found errors', async (done) => {
		const hasThrown = await checkThrowAsync(async () => await api.route('GET', 'pong'));
		expect(hasThrown).toBe(true);
		done();
	});

	it('should get folders', async (done) => {
		let f1 = await Folder.save({ title: "mon carnet" });
		const response = await api.route('GET', 'folders');
		expect(response.length).toBe(1);
		expect(response[0].title).toBe('mon carnet');
		done();
	});

	it('should create notes', async (done) => {
		let response = null;
		const f = await Folder.save({ title: "mon carnet" });
		
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

		done();
	});

	it('should create notes with images', async (done) => {
		let response = null;
		const f = await Folder.save({ title: "mon carnet" });
		
		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing image',
			parent_id: f.id,
			image_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII="
		}));

		const resources = await Resource.all();
		expect(resources.length).toBe(1);

		const resource = resources[0];
		expect(response.body.indexOf(resource.id) >= 0).toBe(true);

		done();
	});

	it('should create notes from HTML', async (done) => {
		let response = null;
		const f = await Folder.save({ title: "mon carnet" });
		
		response = await api.route('POST', 'notes', null, JSON.stringify({
			title: 'testing HTML',
			parent_id: f.id,
			body_html: '<b>Bold text</b>',
		}));

		expect(response.body).toBe('**Bold text**');

		done();
	});

	it('should filter fields', async (done) => {
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

		done();
	});

});