import NoteListUtils from './NoteListUtils';
import KeymapService from '@joplin/lib/services/KeymapService';
import menuCommandNames from '../menuCommandNames';
import { MenuItem as MenuItemType } from '@joplin/lib/services/commands/MenuUtils';
import initializeCommandService from '../../utils/initializeCommandService';
import { createAppDefaultWindowState } from '../../app.reducer';

type MenuItemWrapper = {
	value: MenuItemType;
};

jest.mock('../../services/bridge', () => ({
	__esModule: true,
	default: () => ({
		MenuItem: class MenuItem {
			public value: MenuItemType;
			public constructor(value: MenuItemType) {
				this.value = value;
			}
		},
		Menu: class MockMenu {
			public items: string[] = [];
			public append(item: MenuItemWrapper) {
				const identifier = item.value.id ? item.value.id : (
					item.value.label ? item.value.label : item.value.type
				);
				this.items.push(identifier);
			}
		},
	}),
}));

const mockDispatch = jest.fn();

describe('NoteListUtils', () => {

	beforeEach(() => {
		const mockStore = {
			getState: () => {
				return {
					...createAppDefaultWindowState(),
					settings: {},
				};
			},
		};

		initializeCommandService(mockStore, false);
		const keymapService = KeymapService.instance();
		keymapService.initialize(menuCommandNames());
	});

	it('should show only trash menu options on deleted note', () => {
		const noteIds = ['noteId1'];
		const deletedNote = {
			id: 'noteId1',
			deleted_time: new Date().getTime(),
		};
		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: [
				deletedNote,
			],
			dispatch: mockDispatch,
			watchedNoteFiles: [],
			plugins: {},
			inConflictFolder: false,
			customCss: '',
		});

		expect(menu.items).toEqual([
			'restoreNote',
			'permanentlyDeleteNote',
		]);
	});

	it('should show menu options for normal notes', () => {
		const noteIds = ['noteId1'];
		const normalNote = {
			id: 'noteId1',
		};
		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: [
				normalNote,
			],
			dispatch: mockDispatch,
			watchedNoteFiles: [],
			plugins: {},
			inConflictFolder: false,
			customCss: '',
		});

		expect(menu.items).toEqual([
			'openNoteInNewWindow',
			'startExternalEditing',
			'separator',
			'setTags',
			'separator',
			'toggleNoteType',
			'moveToFolder',
			'duplicateNote',
			'deleteNote',
			'separator',
			'Copy Markdown link',
			'Copy external link',
			'separator',
			'Export',

		]);
	});

	it('should show options when more than one note is selected', () => {
		const noteIds = ['noteId1', 'noteId2'];
		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: [
				{ id: 'noteId1' },
				{ id: 'noteId2' },
			],
			dispatch: mockDispatch,
			watchedNoteFiles: [],
			plugins: {},
			inConflictFolder: false,
			customCss: '',
		});

		expect(menu.items).toEqual([
			'setTags',
			'separator',
			'Switch to note type',
			'Switch to to-do type',
			'moveToFolder',
			'duplicateNote',
			'deleteNote',
			'separator',
			'Copy Markdown link',
			'separator',
			'Export',
		]);
	});

	it('should hide all options for encrypted', () => {
		const noteIds = ['noteId1'];
		const encrypted = {
			id: 'noteId1',
			encryption_applied: 1,
		};
		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: [
				encrypted,
			],
			dispatch: mockDispatch,
			watchedNoteFiles: [],
			plugins: {},
			inConflictFolder: false,
			customCss: '',
		});

		expect(menu.items).toEqual([]);
	});
});
