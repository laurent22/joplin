import { NoteUserData } from '../../services/database/types';
import { msleep, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Folder from '../Folder';
import Note from '../Note';
import { LoadOptions } from './types';
import { deleteNoteUserData, getNoteUserData, mergeUserData, setNoteUserData } from './userData';

const loadOptions: LoadOptions = { fields: ['id', 'parent_id', 'user_data', 'updated_time'] };

describe('utils/userData', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set and get user data', async () => {
		const folder = await Folder.save({});
		let note = await Note.save({ parent_id: folder.id });
		note = await Note.load(note.id, loadOptions);
		await msleep(5);
		await setNoteUserData(note, 'org.joplin', 'my-key', 'something');

		const noteReloaded = await Note.load(note.id);
		expect(getNoteUserData(noteReloaded, 'org.joplin', 'my-key')).toBe('something');

		// Check that the updated_time has been updated (for sync purposes), but
		// not the user_updated_time.
		expect(noteReloaded.updated_time).toBeGreaterThan(note.updated_time);
		expect(noteReloaded.user_updated_time).toBe(note.updated_time);

		// Check for non-existing props
		expect(getNoteUserData(noteReloaded, 'org.doesntexist', 'my-key')).toBe(undefined);
		expect(getNoteUserData(noteReloaded, 'org.joplin', 'doesntexist')).toBe(undefined);
	});

	it('should delete user data', async () => {
		const folder = await Folder.save({});
		let note = await Note.save({ parent_id: folder.id });
		note = await Note.load(note.id, loadOptions);
		await setNoteUserData(note, 'org.joplin', 'my-key', 'something');

		let noteReloaded = await Note.load(note.id);
		expect(getNoteUserData(noteReloaded, 'org.joplin', 'my-key')).toBe('something');

		noteReloaded = await deleteNoteUserData(noteReloaded, 'org.joplin', 'my-key');
		expect(getNoteUserData(noteReloaded, 'org.joplin', 'my-key')).toBe(undefined);

		// Check that it works if we set it again
		await setNoteUserData(note, 'org.joplin', 'my-key', 'something else');
		noteReloaded = await Note.load(noteReloaded.id, loadOptions);
		expect(getNoteUserData(noteReloaded, 'org.joplin', 'my-key')).toBe('something else');
	});

	it('should merge user data', async () => {
		const testCases: [NoteUserData, NoteUserData, NoteUserData][] = [
			[
				{
					'org.joplin': {
						'k1': {
							v: 123,
							t: 0,
						},
						'k3': {
							v: 789,
							t: 5,
						},
						'k4': {
							v: 789,
							t: 5,
						},
					},
					'com.example': {},
				},
				{
					'org.joplin': {
						'k1': {
							v: 456,
							t: 1,
						},
						'k2': {
							v: 'abc',
							t: 5,
						},
						'k4': {
							v: 111,
							t: 0,
						},
					},
				},
				{
					'org.joplin': {
						'k1': {
							v: 456,
							t: 1,
						},
						'k2': {
							v: 'abc',
							t: 5,
						},
						'k3': {
							v: 789,
							t: 5,
						},
						'k4': {
							v: 789,
							t: 5,
						},
					},
					'com.example': {},
				},
			],

			[
				// Client 2 delete a prop
				// Later, client 1 update that prop
				// Then data is merged
				// => In that case, the data is restored using client 1 data
				{
					'org.joplin': {
						'k1': {
							v: 123,
							t: 10,
						},
					},
				},
				{
					'org.joplin': {
						'k1': {
							v: 0,
							t: 0,
							d: 1,
						},
					},
				},
				{
					'org.joplin': {
						'k1': {
							v: 123,
							t: 10,
						},
					},
				},
			],

			[
				// Client 1 update a prop
				// Later, client 2 delete a prop
				// Then data is merged
				// => In that case, the data is deleted and the update from client 1 is lost
				{
					'org.joplin': {
						'k1': {
							v: 123,
							t: 0,
						},
					},
				},
				{
					'org.joplin': {
						'k1': {
							v: 0,
							t: 10,
							d: 1,
						},
					},
				},
				{
					'org.joplin': {
						'k1': {
							v: 0,
							t: 10,
							d: 1,
						},
					},
				},
			],
		];

		for (const [target, source, expected] of testCases) {
			const actual = mergeUserData(target, source);
			expect(actual).toEqual(expected);
		}
	});

});
