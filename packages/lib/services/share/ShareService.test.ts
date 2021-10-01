import Note from '../../models/Note';
import { msleep, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import ShareService from './ShareService';
import reducer from '../../reducer';
import { createStore } from 'redux';
import { NoteEntity } from '../database/types';

function mockApi() {
	return {
		exec: (method: string, path: string = '', _query: Record<string, any> = null, _body: any = null, _headers: any = null, _options: any = null): Promise<any> => {
			if (method === 'GET' && path === 'api/shares') return { items: [] } as any;
			return null;
		},
		personalizedUserContentBaseUrl(_userId: string) {

		},
	};
}

function mockService() {
	const service = new ShareService();
	const store = createStore(reducer as any);
	service.initialize(store, mockApi() as any);
	return service;
}

describe('ShareService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should not change the note user timestamps when sharing or unsharing', (async () => {
		let note = await Note.save({});
		const service = mockService();
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
	}));

});
