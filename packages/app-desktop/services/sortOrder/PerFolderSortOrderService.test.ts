import PerFolderSortOrderService from './PerFolderSortOrderService';
import { setNotesSortOrder } from './notesSortOrderUtils';
import Setting from '@joplin/lib/models/Setting';
const { shimInit } = require('@joplin/lib/shim-init-node.js');

const folderId1 = 'aa012345678901234567890123456789';
const folderId2 = 'bb012345678901234567890123456789';

describe('PerFolderSortOrderService', () => {

	beforeAll(async () => {
		shimInit();
		Setting.autoSaveEnabled = false;
		PerFolderSortOrderService.initialize();
		Setting.setValue('notes.perFolderSortOrderEnabled', true);
	});

	test('get(), isSet() and set()', async () => {
		// Clear all per-folder sort order
		expect(PerFolderSortOrderService.isSet(folderId1)).toBe(false);
		expect(PerFolderSortOrderService.isSet(folderId2)).toBe(false);

		// Set shared sort order
		setNotesSortOrder('user_created_time', false);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// Manipulate per-folder sort order
		PerFolderSortOrderService.set(folderId1, true);
		expect(PerFolderSortOrderService.isSet(folderId1)).toBe(true);
		PerFolderSortOrderService.set(folderId1, false);
		expect(PerFolderSortOrderService.isSet(folderId1)).toBe(false);
		PerFolderSortOrderService.set(folderId1);
		expect(PerFolderSortOrderService.isSet(folderId1)).toBe(true);

		// Get per-folder sort order from a folder with per-folder sort order
		expect(PerFolderSortOrderService.get(folderId1)).toBeDefined();

		// Folder without per-folder sort order has no per-folder sort order
		expect(PerFolderSortOrderService.get(folderId2)).toBeUndefined();
	});
});
