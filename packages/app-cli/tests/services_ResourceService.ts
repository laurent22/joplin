import time from '@joplin/lib/time';
import NoteResource from '@joplin/lib/models/NoteResource';
import ResourceService from '@joplin/lib/services/ResourceService';
import shim from '@joplin/lib/shim';

const { resourceService, decryptionWorker, encryptionService, loadEncryptionMasterKey, allSyncTargetItemsEncrypted, setupDatabaseAndSynchronizer, db, synchronizer, switchClient } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const Resource = require('@joplin/lib/models/Resource.js');
const SearchEngine = require('@joplin/lib/services/searchengine/SearchEngine');

describe('services_ResourceService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should delete orphaned resources', (async () => {
		const service = new ResourceService();

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const resource1 = (await Resource.all())[0];
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

	it('should not delete resource if still associated with at least one note', (async () => {
		const service = new ResourceService();

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma deuxième note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const resource1 = (await Resource.all())[0];

		await service.indexNoteResources();

		await Note.delete(note1.id);

		await service.indexNoteResources();

		await Note.save({ id: note2.id, body: Resource.markdownTag(resource1) });

		await service.indexNoteResources();

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);
	}));

	it('should not delete a resource that has never been associated with any note, because it probably means the resource came via sync, and associated note has not arrived yet', (async () => {
		const service = new ResourceService();
		await shim.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);

		await service.indexNoteResources();
		await service.deleteOrphanResources(0);

		expect((await Resource.all()).length).toBe(1);
	}));

	it('should not delete resource if it is used in an IMG tag', (async () => {
		const service = new ResourceService();

		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const resource1 = (await Resource.all())[0];

		await service.indexNoteResources();

		await Note.save({ id: note1.id, body: `This is HTML: <img src=":/${resource1.id}"/>` });

		await service.indexNoteResources();

		await service.deleteOrphanResources(0);

		expect(!!(await Resource.load(resource1.id))).toBe(true);
	}));

	it('should not process twice the same change', (async () => {
		const service = new ResourceService();

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);

		await service.indexNoteResources();

		const before = (await NoteResource.all())[0];

		await time.sleep(0.1);

		await service.indexNoteResources();

		const after = (await NoteResource.all())[0];

		expect(before.last_seen_time).toBe(after.last_seen_time);
	}));

	it('should not delete resources that are associated with an encrypted note', (async () => {
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
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
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

	it('should double-check if the resource is still linked before deleting it', (async () => {
		SearchEngine.instance().setDb(db()); // /!\ Note that we use the global search engine here, which we shouldn't but will work for now

		const folder1 = await Folder.save({ title: 'folder1' });
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

	// it('should auto-delete resource even if the associated note was deleted immediately', (async () => {
	// 	// Previoulsy, when a resource was be attached to a note, then the
	// 	// note was immediately deleted, the ResourceService would not have
	// 	// time to quick in an index the resource/note relation. It means
	// 	// that when doing the orphan resource deletion job, those
	// 	// resources would permanently stay behing.
	// 	// https://github.com/laurent22/joplin/issues/932

	// 	const service = new ResourceService();

	// 	let note = await Note.save({});
	// 	note = await shim.attachFileToNote(note, `${__dirname}/../tests/support/photo.jpg`);
	// 	const resource = (await Resource.all())[0];

	// 	const noteIds = await NoteResource.associatedNoteIds(resource.id);

	// 	expect(noteIds[0]).toBe(note.id);

	// 	await Note.save({ id: note.id, body: '' });

	// 	await resourceService().indexNoteResources();
	// 	await service.deleteOrphanResources(0);

	// 	expect((await Resource.all()).length).toBe(0);
	// }));

});
