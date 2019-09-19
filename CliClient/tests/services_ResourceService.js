/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, resourceService, decryptionWorker, encryptionService, loadEncryptionMasterKey, allSyncTargetItemsEncrypted, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const InteropService = require('lib/services/InteropService.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const Resource = require('lib/models/Resource.js');
const ItemChange = require('lib/models/ItemChange.js');
const NoteResource = require('lib/models/NoteResource.js');
const ResourceService = require('lib/services/ResourceService.js');
const fs = require('fs-extra');
const ArrayUtils = require('lib/ArrayUtils');
const ObjectUtils = require('lib/ObjectUtils');
const { shim } = require('lib/shim.js');
const SearchEngine = require('lib/services/SearchEngine');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

function exportDir() {
	return `${__dirname}/export`;
}

function fieldsEqual(model1, model2, fieldNames) {
	for (let i = 0; i < fieldNames.length; i++) {
		const f = fieldNames[i];
		expect(model1[f]).toBe(model2[f], `For key ${f}`);
	}
}

describe('services_ResourceService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should delete orphaned resources', asyncTest(async () => {
		const service = new ResourceService();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		const resourcePath = Resource.fullPath(resource1);

		await service.indexNoteResources();
		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);

		await Note.delete(note1.id);
		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);

		await service.indexNoteResources();
		await service.deleteOrphanResources(1000 * 60);

		expect(!!(await Resource.load(resource1.id))).toBe(true);

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(false);
		expect(await shim.fsDriver().exists(resourcePath)).toBe(false);
		expect(!(await NoteResource.all()).length).toBe(true);
	}));

	it('should not delete resource if still associated with at least one note', asyncTest(async () => {
		const service = new ResourceService();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'ma deuxième note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];

		await service.indexNoteResources();

		await Note.delete(note1.id);

		await service.indexNoteResources();

		await Note.save({ id: note2.id, body: Resource.markdownTag(resource1) });

		await service.indexNoteResources();

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);
	}));

	it('should not delete a resource that has never been associated with any note, because it probably means the resource came via sync, and associated note has not arrived yet', asyncTest(async () => {
		const service = new ResourceService();
		const resource = await shim.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);

		await service.indexNoteResources();
		await service.deleteOrphanResources(0);

		expect((await Resource.all()).length).toBe(1);
	}));

	it('should not delete resource if it is used in an IMG tag', asyncTest(async () => {
		const service = new ResourceService();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];

		await service.indexNoteResources();

		await Note.save({ id: note1.id, body: `This is HTML: <img src=":/${resource1.id}"/>` });

		await service.indexNoteResources();

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);
	}));

	it('should not process twice the same change', asyncTest(async () => {
		const service = new ResourceService();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];

		await service.indexNoteResources();

		const before = (await NoteResource.all())[0];

		await time.sleep(0.1);

		await service.indexNoteResources();

		const after = (await NoteResource.all())[0];

		expect(before.last_seen_time).toBe(after.last_seen_time);
	}));

	it('should not delete resources that are associated with an encrypted note', asyncTest(async () => {
		// https://github.com/laurent22/joplin/issues/1433
		//
		// Client 1 and client 2 have E2EE setup.
		//
		// - Client 1 creates note N1 and add resource R1 to it
		// - Client 1 syncs
		// - Client 2 syncs and get N1
		// - Client 2 add resource R2 to N1
		// - Client 2 syncs
		// - Client 1 syncs
		// - Client 1 runs resource indexer - but because N1 hasn't been decrypted yet, it found that R1 is no longer associated with any note
		// - Client 1 decrypts notes, but too late
		//
		// Eventually R1 is deleted because service thinks that it was at some point associated with a note, but no longer.

		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`); // R1
		await resourceService().indexNoteResources();
		await synchronizer().start();
		expect(await allSyncTargetItemsEncrypted()).toBe(true);

		await switchClient(2);

		await synchronizer().start();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await decryptionWorker().start();
		{
			const n1 = await Note.load(note1.id);
			await shim.attachFileToNote(n1, `${__dirname}/../tests/support/photo.jpg`); // R2
		}
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		await resourceService().indexNoteResources();
		await resourceService().deleteOrphanResources(0); // Previously, R1 would be deleted here because it's not indexed
		expect((await Resource.all()).length).toBe(2);
	}));

	it('should double-check if the resource is still linked before deleting it', asyncTest(async () => {
		SearchEngine.instance().setDb(db()); // /!\ Note that we use the global search engine here, which we shouldn't but will work for now

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		await resourceService().indexNoteResources();
		const bodyWithResource = note1.body;
		await Note.save({ id: note1.id, body: '' });
		await resourceService().indexNoteResources();
		await Note.save({ id: note1.id, body: bodyWithResource });
		await SearchEngine.instance().syncTables();
		await resourceService().deleteOrphanResources(0);

		expect((await Resource.all()).length).toBe(1); // It should not have deleted the resource
		const nr = (await NoteResource.all())[0];
		expect(!!nr.is_associated).toBe(true); // And it should have fixed the situation by re-indexing the note content
	}));

});
