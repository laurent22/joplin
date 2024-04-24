import PerFolderSortOrderService from './PerFolderSortOrderService';
import { setNotesSortOrder } from './notesSortOrderUtils';
import Setting from '@joplin/lib/models/Setting';
import { AppState, createAppDefaultState } from '../../app.reducer';
import eventManager from '@joplin/lib/eventManager';
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');

const folderId1 = 'aa012345678901234567890123456789';
const folderId2 = 'bb012345678901234567890123456789';

let appState: AppState|null = null;
const updateAppState = (update: Partial<AppState>) => {
	appState = { ...appState, ...update };
	eventManager.appStateEmit(appState);
};

const switchToFolder = (id: string) => {
	updateAppState({
		notesParentType: 'Folder',
		selectedFolderId: id,
	});
};

const switchToAllNotes = () => {
	updateAppState({
		notesParentType: 'SmartFilter',
		selectedSmartFilterId: ALL_NOTES_FILTER_ID,
	});
};

describe('PerFolderSortOrderService', () => {

	beforeAll(async () => {
		shimInit();
		Setting.autoSaveEnabled = false;
	});

	beforeEach(() => {
		PerFolderSortOrderService.initialize();
		Setting.setValue('notes.perFolderSortOrderEnabled', true);
		updateAppState(createAppDefaultState({}, {}));
		switchToFolder(folderId1);
	});
	afterEach(() => {
		Setting.setValue('notes.perFolderSortOrders', {});
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

	test('should allow specifying a sort order specific to a folder', () => {
		switchToFolder(folderId1);

		expect(PerFolderSortOrderService.isSet(folderId1)).toBe(false);
		expect(PerFolderSortOrderService.isSet(folderId2)).toBe(false);

		setNotesSortOrder('user_created_time', false);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// Folder 2 should use the shared sort order.
		switchToFolder(folderId2);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// If changing the per-folder sort order for folder 1, folder 2 should continue
		// to use the shared sort order.
		switchToFolder(folderId1);
		PerFolderSortOrderService.set(folderId1, true);

		setNotesSortOrder('title', true);
		expect(Setting.value('notes.sortOrder.field')).toBe('title');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);

		switchToFolder(folderId2);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);
	});

	test('should allow setting a sort order specific to All Notes', () => {
		switchToFolder(folderId1);

		expect(PerFolderSortOrderService.isSet(ALL_NOTES_FILTER_ID)).toBe(false);
		expect(PerFolderSortOrderService.isSet(folderId1)).toBe(false);

		// Set default shared sort order
		setNotesSortOrder('user_created_time', false);
		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// Switching to all notes should not change the default sort order.
		switchToAllNotes();

		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// It should be possible to enable per-folder sorting for all notes.
		PerFolderSortOrderService.set(ALL_NOTES_FILTER_ID, true);
		expect(PerFolderSortOrderService.isSet(ALL_NOTES_FILTER_ID)).toBe(true);

		setNotesSortOrder('user_updated_time', true);

		// Per-folder sorting should be respected for all notes
		switchToFolder(folderId1);

		expect(Setting.value('notes.sortOrder.field')).toBe('user_created_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(false);

		// Shared sort order should be overriden by per-folder sorting
		setNotesSortOrder('title', false);

		switchToAllNotes();

		expect(Setting.value('notes.sortOrder.field')).toBe('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toBe(true);
	});
});
