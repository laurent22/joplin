import Api, { RequestMethod } from '../Api';
import Note from '../../../models/Note';
import Revision from '../../../models/Revision';
import Setting from '../../../models/Setting';
import BaseModel from '../../../BaseModel';
import { setupDatabaseAndSynchronizer, switchClient, noteLockCipherTextStandIn } from '../../../testing/test-utils';
import { RevisionEntity } from '../../database/types';
import { lockedNoteBodyPlaceholder } from '../../noteLock/NoteLockNote';

const createNoteAndRevision = async (isLocked: number) => {
	// A JLD-prefixed body passes the save path untouched, standing in for real ciphertext.
	const note = await Note.save({ title: 'note', body: isLocked ? noteLockCipherTextStandIn('body') : 'body', is_locked: isLocked });
	const revision = await Revision.save({
		item_type: BaseModel.TYPE_NOTE,
		item_id: note.id,
		item_updated_time: note.updated_time,
		parent_id: '',
		title_diff: '[]',
		body_diff: '[]',
		metadata_diff: '{"new":{},"deleted":[]}',
		is_locked: isLocked,
	});
	return { note, revision };
};

describe('routes/revisions', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should load a locked revision with a placeholder body and block its save', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const api = new Api();
		const { revision } = await createNoteAndRevision(1);

		const loaded = await api.route(RequestMethod.GET, `revisions/${revision.id}`, { fields: 'id,body_diff' });
		expect(Revision.applyTextPatch('', loaded.body_diff)).toBe(lockedNoteBodyPlaceholder);
		expect('is_locked' in loaded).toBe(false);
		await expect(api.route(RequestMethod.PUT, `revisions/${revision.id}`, null, JSON.stringify({ title_diff: '[]' }))).rejects.toThrow('locked revision');

		expect(await Revision.load(revision.id)).toBeTruthy();
	});

	test('should still allow deleting the revisions of a locked note', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const api = new Api();
		const { revision } = await createNoteAndRevision(1);

		await api.route(RequestMethod.DELETE, `revisions/${revision.id}`);
		expect(await Revision.load(revision.id)).toBeFalsy();
	});

	test('should list the revisions of locked notes with a placeholder body', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const api = new Api();
		const { revision: lockedRevision } = await createNoteAndRevision(1);
		const { revision: plainRevision } = await createNoteAndRevision(0);

		const response = await api.route(RequestMethod.GET, 'revisions', { fields: 'id,body_diff' });
		const bodyDiffs = new Map(response.items.map((r: RevisionEntity) => [r.id, r.body_diff]));
		expect(Revision.applyTextPatch('', bodyDiffs.get(lockedRevision.id) as string)).toBe(lockedNoteBodyPlaceholder);
		expect(bodyDiffs.get(plainRevision.id)).toBe('[]');
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
