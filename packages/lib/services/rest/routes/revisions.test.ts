import Api, { RequestMethod } from '../Api';
import Note from '../../../models/Note';
import Revision from '../../../models/Revision';
import Setting from '../../../models/Setting';
import BaseModel from '../../../BaseModel';
import { setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';

const createNoteAndRevision = async (isLocked: number) => {
	const note = await Note.save({ title: 'note', body: 'body', is_locked: isLocked });
	const revision = await Revision.save({
		item_type: BaseModel.TYPE_NOTE,
		item_id: note.id,
		item_updated_time: note.updated_time,
		parent_id: '',
		title_diff: '[]',
		body_diff: '[]',
		metadata_diff: '{"new":{},"deleted":[]}',
	});
	return { note, revision };
};

describe('routes/revisions', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should block revision load and save for locked notes', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const api = new Api();
		const { note, revision } = await createNoteAndRevision(1);

		await expect(api.route(RequestMethod.GET, `revisions/${revision.id}`)).rejects.toThrow('locked note');
		await expect(api.route(RequestMethod.PUT, `revisions/${revision.id}`, null, JSON.stringify({ title_diff: '[]' }))).rejects.toThrow('locked note');
		await expect(api.route(RequestMethod.POST, 'revisions', null, JSON.stringify({
			item_type: BaseModel.TYPE_NOTE,
			item_id: note.id,
			item_updated_time: note.updated_time,
			title_diff: '[]',
			body_diff: '[]',
			metadata_diff: '{"new":{},"deleted":[]}',
		}))).rejects.toThrow('locked note');

		expect(await Revision.load(revision.id)).toBeTruthy();
	});

	test('should block moving an existing revision onto a locked note', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const api = new Api();
		const { note: lockedNote } = await createNoteAndRevision(1);
		const { revision } = await createNoteAndRevision(0);

		await expect(api.route(RequestMethod.PUT, `revisions/${revision.id}`, null, JSON.stringify({ item_id: lockedNote.id }))).rejects.toThrow('locked note');
		expect((await Revision.load(revision.id)).item_id).not.toBe(lockedNote.id);
	});

	test('should still allow deleting the revisions of a locked note', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const api = new Api();
		const { revision } = await createNoteAndRevision(1);

		await api.route(RequestMethod.DELETE, `revisions/${revision.id}`);
		expect(await Revision.load(revision.id)).toBeFalsy();
	});

	test.each([
		{ label: 'the note is not locked', flagEnabled: true, isLocked: 0 },
		{ label: 'note lock is disabled', flagEnabled: false, isLocked: 1 },
	])('should allow revision access when $label', async ({ flagEnabled, isLocked }) => {
		Setting.setValue('featureFlag.noteLock', flagEnabled);
		const api = new Api();
		const { revision } = await createNoteAndRevision(isLocked);

		const response = await api.route(RequestMethod.GET, `revisions/${revision.id}`);
		expect(response.id).toBe(revision.id);
	});

});
