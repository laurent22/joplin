import { notesSortOrderFieldArray, notesSortOrderNextField, setNotesSortOrder } from './notesSortOrderUtils';
import Setting from '@joplin/lib/models/Setting';
const { shimInit } = require('@joplin/lib/shim-init-node.js');

describe('notesSortOrderUtils', () => {

	beforeAll(() => {
		shimInit();
		Setting.autoSaveEnabled = false;
	});

	it('should always provide the same ordered fields', async () => {
		const expected = ['user_updated_time', 'user_created_time', 'title', 'order'];
		expect(notesSortOrderFieldArray()).toStrictEqual(expected);
		expect(notesSortOrderFieldArray()).toStrictEqual(expected);
	});

	it('should provide the next field cyclicly', async () => {
		expect(notesSortOrderNextField('user_updated_time')).toBe('user_created_time');
		expect(notesSortOrderNextField('order')).toBe('user_updated_time');
	});

	test('setNoteSortOrder(), when perFieldReversalEnabled is false', async () => {
		Setting.setValue('notes.perFieldReversalEnabled', false);

		// It should set field and reverse of sort order.
		setNotesSortOrder('user_created_time', false);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);
		setNotesSortOrder('user_updated_time', true);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);
		setNotesSortOrder('title', true);
		expect(Setting.value('notes.sortOrder.field')).toBe('title');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);

		// It should affect the current field of sort order, if arg1 is undefined.
		setNotesSortOrder(undefined, false);
		expect(Setting.value('notes.sortOrder.field')).toBe('title');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// it should only set field of sort order, if arg2 is undefined.
		setNotesSortOrder('user_updated_time');
		expect(Setting.value('notes.sortOrder.field')).toBe('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// It should select the next field, if arg1 and arg2 are undefined.
		setNotesSortOrder();
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);
	});

	test('setNoteSortOrder(), when perFieldReversalEnabled is true', async () => {
		Setting.setValue('notes.perFieldReversalEnabled', true);
		// It should set field and reverse of sort order.
		setNotesSortOrder('user_created_time', false);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);
		setNotesSortOrder('user_updated_time', true);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);
		setNotesSortOrder('title', true);
		expect(Setting.value('notes.sortOrder.field')).toBe('title');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);

		// it should affect the current field of sort order, if arg1 is undefined.
		setNotesSortOrder(undefined, false);
		expect(Setting.value('notes.sortOrder.field')).toBe('title');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// It should remember a reverse state, if arg2 is undefined.
		setNotesSortOrder('user_updated_time');
		expect(Setting.value('notes.sortOrder.field')).toBe('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);

		// It should select the next field and remember a reverse state, if arg1 and arg2 are undefined.
		setNotesSortOrder();
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);
	});

	it('should not accept an invalid field name', async () => {
		expect(() => setNotesSortOrder('hoge', true)).toThrow();
	});
});
