import Note from '../../models/Note';
import { encryptionService, msleep, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import ShareService from './ShareService';
import reducer from '../../reducer';
import { createStore } from 'redux';
import { FolderEntity, NoteEntity } from '../database/types';
import Folder from '../../models/Folder';
import { setEncryptionEnabled, setPpk } from '../synchronizer/syncInfoUtils';
import { generateKeyPair } from '../e2ee/ppk';
import MasterKey from '../../models/MasterKey';
import { MasterKeyEntity } from '../e2ee/types';
import { updateMasterPassword } from '../e2ee/utils';

function mockService(api: any) {
	const service = new ShareService();
	const store = createStore(reducer as any);
	service.initialize(store, encryptionService(), api);
	return service;
}

describe('ShareService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should not change the note user timestamps when sharing or unsharing', async () => {
		let note = await Note.save({});
		const service = mockService({
			exec: (method: string, path: string = '', _query: Record<string, any> = null, _body: any = null, _headers: any = null, _options: any = null): Promise<any> => {
				if (method === 'GET' && path === 'api/shares') return { items: [] } as any;
				return null;
			},
			personalizedUserContentBaseUrl(_userId: string) {

			},
		});
		await msleep(1);
		await service.shareNote(note.id);

		function checkTimestamps(previousNote: NoteEntity, newNote: NoteEntity) {
			// After sharing or unsharing, only the updated_time property should
			// be updated, for sync purposes. All other timestamps shouldn't
			// change.
			expect(previousNote.user_created_time).toBe(newNote.user_created_time);
			expect(previousNote.user_updated_time).toBe(newNote.user_updated_time);
			expect(previousNote.updated_time < newNote.updated_time).toBe(true);
			expect(previousNote.created_time).toBe(newNote.created_time);
		}

		{
			const noteReloaded = await Note.load(note.id);
			checkTimestamps(note, noteReloaded);
			note = noteReloaded;
		}

		await msleep(1);
		await service.unshareNote(note.id);

		{
			const noteReloaded = await Note.load(note.id);
			checkTimestamps(note, noteReloaded);
		}
	});

	function testShareFolderService(extraExecHandlers: Record<string, Function> = {}) {
		return mockService({
			exec: async (method: string, path: string, query: Record<string, any>, body: any) => {
				if (extraExecHandlers[`${method} ${path}`]) return extraExecHandlers[`${method} ${path}`](query, body);

				if (method === 'POST' && path === 'api/shares') {
					return {
						id: 'share_1',
					};
				}

				throw new Error(`Unhandled: ${method} ${path}`);
			},
		});
	}

	async function testShareFolder(service: ShareService) {
		const folder = await Folder.save({});
		const note = await Note.save({ parent_id: folder.id });

		const share = await service.shareFolder(folder.id);
		expect(share.id).toBe('share_1');
		expect((await Folder.load(folder.id)).share_id).toBe('share_1');
		expect((await Note.load(note.id)).share_id).toBe('share_1');

		return share;
	}

	it('should share a folder', async () => {
		await testShareFolder(testShareFolderService());
	});

	it('should share a folder - E2EE', async () => {
		setEncryptionEnabled(true);
		await updateMasterPassword('', '111111');
		const ppk = await generateKeyPair(encryptionService(), '111111');
		setPpk(ppk);

		await testShareFolder(testShareFolderService());

		expect((await MasterKey.all()).length).toBe(1);

		const mk = (await MasterKey.all())[0];
		const folder: FolderEntity = (await Folder.all())[0];
		expect(folder.master_key_id).toBe(mk.id);
	});

	it('should add a recipient', async () => {
		setEncryptionEnabled(true);
		await updateMasterPassword('', '111111');
		const ppk = await generateKeyPair(encryptionService(), '111111');
		setPpk(ppk);
		const recipientPpk = await generateKeyPair(encryptionService(), '222222');
		expect(ppk.id).not.toBe(recipientPpk.id);

		let uploadedEmail: string = '';
		let uploadedMasterKey: MasterKeyEntity = null;

		const service = testShareFolderService({
			'POST api/shares': (_query: Record<string, any>, body: any) => {
				return {
					id: 'share_1',
					master_key_id: body.master_key_id,
				};
			},
			'GET api/users/toto%40example.com/public_key': async (_query: Record<string, any>, _body: any) => {
				return recipientPpk;
			},
			'POST api/shares/share_1/users': async (_query: Record<string, any>, body: any) => {
				uploadedEmail = body.email;
				uploadedMasterKey = JSON.parse(body.master_key);
			},
		});

		const share = await testShareFolder(service);

		await service.addShareRecipient(share.id, share.master_key_id, 'toto@example.com');

		expect(uploadedEmail).toBe('toto@example.com');

		const content = JSON.parse(uploadedMasterKey.content);
		expect(content.ppkId).toBe(recipientPpk.id);
	});

});
