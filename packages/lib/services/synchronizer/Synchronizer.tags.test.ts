import { synchronizerStart, setupDatabaseAndSynchronizer, switchClient, encryptionService, loadEncryptionMasterKey } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import MasterKey from '../../models/MasterKey';
import { setEncryptionEnabled } from '../synchronizer/syncInfoUtils';

describe('Synchronizer.tags', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	async function shoudSyncTagTest(withEncryption: boolean) {
		let masterKey = null;
		if (withEncryption) {
			setEncryptionEnabled(true);
			masterKey = await loadEncryptionMasterKey();
		}

		await Folder.save({ title: 'folder' });
		const n1 = await Note.save({ title: 'mynote' });
		const n2 = await Note.save({ title: 'mynote2' });
		const tag = await Tag.save({ title: 'mytag' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		if (withEncryption) {
			const masterKey_2 = await MasterKey.load(masterKey.id);
			await encryptionService().loadMasterKey(masterKey_2, '123456', true);
			const t = await Tag.load(tag.id);
			await Tag.decrypt(t);
		}
		const remoteTag = await Tag.loadByTitle(tag.title);
		expect(!!remoteTag).toBe(true);
		expect(remoteTag.id).toBe(tag.id);
		await Tag.addNote(remoteTag.id, n1.id);
		await Tag.addNote(remoteTag.id, n2.id);
		let noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.length).toBe(2);
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();
		let remoteNoteIds = await Tag.noteIds(tag.id);
		expect(remoteNoteIds.length).toBe(2);
		await Tag.removeNote(tag.id, n1.id);
		remoteNoteIds = await Tag.noteIds(tag.id);
		expect(remoteNoteIds.length).toBe(1);
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.length).toBe(1);
		expect(remoteNoteIds[0]).toBe(noteIds[0]);
	}

	it('should sync tags', (async () => {
		await shoudSyncTagTest(false);
	}));

	it('should sync encrypted tags', (async () => {
		await shoudSyncTagTest(true);
	}));

});
