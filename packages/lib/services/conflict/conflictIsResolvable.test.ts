import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import BaseItem from '../../models/BaseItem';
import { MarkupLanguage } from '@joplin/renderer';
import conflictIsResolvable, { conflictNoteIsResolvable } from './conflictIsResolvable';

const createConflictNote = async (noteProps = {}, originalProps = {}) => {
	const original = await Note.save({ title: 'Title', body: 'theirs', ...originalProps });
	return Note.save({ title: 'Title', body: 'mine', is_conflict: 1, conflict_original_id: original.id, ...noteProps });
};

describe('conflictIsResolvable', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('featureFlag.conflictResolution', true);
		BaseItem.syncShareCache = null;
	});

	test('should be resolvable and return the original', async () => {
		const note = await createConflictNote();

		const result = await conflictIsResolvable(note);

		expect(result.resolvable).toBe(true);
		expect(result.original.id).toBe(note.conflict_original_id);
	});

	test('should not be resolvable without an original, as for a folder conflict', async () => {
		const note = await Note.save({ title: 'Title', body: 'mine', is_conflict: 1 });

		const result = await conflictIsResolvable(note);

		expect(result.resolvable).toBe(false);
		expect(result.original).toBe(null);
	});

	test.each([
		['an encrypted note', { encryption_applied: 1 }],
		['a locked note', { is_locked: 1 }],
		['an HTML note', { markup_language: MarkupLanguage.Html }],
		['a note that is not a conflict', { is_conflict: 0 }],
	])('should not be resolvable for %s', async (_description, noteProps) => {
		const note = await createConflictNote(noteProps);

		expect(conflictNoteIsResolvable(note)).toBe(false);
		expect((await conflictIsResolvable(note)).resolvable).toBe(false);
	});

	test.each([
		['is encrypted', { encryption_applied: 1 }],
		['is locked', { is_locked: 1 }],
		['is HTML', { markup_language: MarkupLanguage.Html }],
	])('should not be resolvable when the original %s', async (_description, originalProps) => {
		const note = await createConflictNote({}, originalProps);

		expect((await conflictIsResolvable(note)).resolvable).toBe(false);
	});

	test('should treat a note with no markup language as Markdown', async () => {
		const note = await createConflictNote();

		expect(conflictNoteIsResolvable({ ...note, markup_language: undefined })).toBe(true);
	});

	test('should not be resolvable when the feature flag is off', async () => {
		const note = await createConflictNote();
		Setting.setValue('featureFlag.conflictResolution', false);

		expect(conflictNoteIsResolvable(note)).toBe(false);
		expect((await conflictIsResolvable(note)).resolvable).toBe(false);
	});

	test('should not be resolvable without a note', async () => {
		expect(conflictNoteIsResolvable(null)).toBe(false);
		expect((await conflictIsResolvable(null)).resolvable).toBe(false);
	});
});
