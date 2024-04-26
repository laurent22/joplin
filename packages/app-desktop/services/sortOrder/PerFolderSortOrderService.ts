import Setting from '@joplin/lib/models/Setting';
import eventManager from '@joplin/lib/eventManager';
import { notesSortOrderFieldArray, setNotesSortOrder } from './notesSortOrderUtils';

const SUFFIX_FIELD = '$field';
const SUFFIX_REVERSE = '$reverse';

export interface SortOrder {
	field: string;
	reverse: boolean;
}

interface FolderState {
	notesParentType: string;
	selectedFolderId: string;
	selectedSmartFilterId: string;
}

interface SortOrderPool {
	[key: string]: string | boolean;
}

export default class PerFolderSortOrderService {

	// To support a custom sort order in "all notebooks", previousFolderId
	// can also be a smart filter ID.
	private static previousFolderId: string = null;
	private static folderState: FolderState = { notesParentType: '', selectedFolderId: '', selectedSmartFilterId: '' };
	// Since perFolderSortOrders and sharedSortOrder is persisted using Setting,
	// their structures are not nested.
	private static perFolderSortOrders: SortOrderPool = null;
	private static sharedSortOrder: SortOrder & SortOrderPool = {
		field: 'user_updated_time',
		reverse: true,
		user_updated_time: true,
		user_created_time: true,
		title: false,
		order: false,
	};

	public static initialize() {
		this.loadPerFolderSortOrders();
		this.loadSharedSortOrder();
		eventManager.appStateOn('notesParentType', this.onFolderSelectionMayChange.bind(this, 'notesParentType'));
		eventManager.appStateOn('selectedFolderId', this.onFolderSelectionMayChange.bind(this, 'selectedFolderId'));
		eventManager.appStateOn('selectedSmartFilterId', this.onFolderSelectionMayChange.bind(this, 'selectedSmartFilterId'));
		this.previousFolderId = Setting.value('activeFolderId');
	}

	public static isSet(folderId: string): boolean {
		return folderId && this.perFolderSortOrders && this.perFolderSortOrders.hasOwnProperty(folderId + SUFFIX_FIELD);
	}

	public static get(folderId: string): SortOrder {
		if (folderId && this.perFolderSortOrders) {
			const field = this.perFolderSortOrders[folderId + SUFFIX_FIELD] as string;
			const reverse = this.perFolderSortOrders[folderId + SUFFIX_REVERSE] as boolean;
			if (field) return { field, reverse };
		}
		return undefined;
	}

	public static set(folderId?: string, own?: boolean) {
		let targetId = folderId;
		const selectedId = this.getSelectedFolderId();
		if (!targetId) {
			targetId = selectedId; // default: selected folder
			if (!targetId) return;
		}
		const targetOwn = this.isSet(targetId);
		let newOwn;
		if (typeof own === 'undefined') {
			newOwn = !targetOwn; // default: toggling
		} else {
			newOwn = !!own;
			if (newOwn === targetOwn) return;
		}
		if (newOwn) {
			let field: string, reverse: boolean;
			if (!this.isSet(selectedId)) {
				field = Setting.value('notes.sortOrder.field');
				reverse = Setting.value('notes.sortOrder.reverse');
			} else {
				field = this.sharedSortOrder.field;
				if (Setting.value('notes.perFieldReversalEnabled')) {
					reverse = this.sharedSortOrder[field] as boolean;
				} else {
					reverse = this.sharedSortOrder.reverse;
				}
			}
			PerFolderSortOrderService.setPerFolderSortOrder(targetId, field, reverse);
		} else {
			PerFolderSortOrderService.deletePerFolderSortOrder(targetId);
		}
	}


	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static onFolderSelectionMayChange(cause: string, event: any) {
		if (cause !== 'notesParentType' && cause !== 'selectedFolderId' && cause !== 'selectedSmartFilterId') {
			return;
		}
		this.folderState[cause] = event.value;
		const selectedId = this.getSelectedFolderId();
		if (this.previousFolderId === selectedId) return;
		const field: string = Setting.value('notes.sortOrder.field');
		const reverse: boolean = Setting.value('notes.sortOrder.reverse');
		let previousFolderHasPerFolderSortOrder = false;
		if (this.previousFolderId !== null) {
			previousFolderHasPerFolderSortOrder = this.isSet(this.previousFolderId);
			if (previousFolderHasPerFolderSortOrder) {
				this.setPerFolderSortOrder(this.previousFolderId, field, reverse);
			} else {
				this.setSharedSortOrder(field, reverse);
			}
		}
		this.previousFolderId = selectedId;
		let next: SortOrder;
		if (this.isSet(selectedId)) {
			next = this.get(selectedId);
		} else if (previousFolderHasPerFolderSortOrder) {
			next = this.sharedSortOrder;
		} else {
			return;
		}
		if (Setting.value('notes.perFolderSortOrderEnabled')) {
			if (next.field !== field || next.reverse !== reverse) {
				setNotesSortOrder(next.field, next.reverse);
			}
		}
	}

	private static getSelectedFolderId(): string {
		if (this.folderState.notesParentType === 'Folder') {
			return this.folderState.selectedFolderId;
		} else if (this.folderState.notesParentType === 'SmartFilter') {
			return this.folderState.selectedSmartFilterId;
		} else {
			return '';
		}
	}

	private static loadPerFolderSortOrders() {
		this.perFolderSortOrders = { ...Setting.value('notes.perFolderSortOrders') };
	}

	private static loadSharedSortOrder() {
		const validFields = notesSortOrderFieldArray();
		const value = Setting.value('notes.sharedSortOrder');
		for (const key in this.sharedSortOrder) {
			if (value.hasOwnProperty(key)) {
				if (key !== 'field' || validFields.includes(value.field)) {
					this.sharedSortOrder[key] = value[key];
				}
			}
		}
	}

	private static setPerFolderSortOrder(folderId: string, field: string, reverse: boolean) {
		const old = this.get(folderId);
		let dirty = false;
		if (!(old?.field === field)) {
			this.perFolderSortOrders[folderId + SUFFIX_FIELD] = field;
			dirty = true;
		}
		if (!(old?.reverse === reverse)) {
			this.perFolderSortOrders[folderId + SUFFIX_REVERSE] = reverse;
			dirty = true;
		}
		if (dirty) {
			Setting.setValue('notes.perFolderSortOrders', { ...this.perFolderSortOrders });
		}
	}

	private static deletePerFolderSortOrder(folderId: string) {
		let dirty = false;
		if (this.perFolderSortOrders.hasOwnProperty(folderId + SUFFIX_FIELD)) {
			delete this.perFolderSortOrders[folderId + SUFFIX_FIELD];
			dirty = true;
		}
		if (this.perFolderSortOrders.hasOwnProperty(folderId + SUFFIX_REVERSE)) {
			delete this.perFolderSortOrders[folderId + SUFFIX_REVERSE];
			dirty = true;
		}
		if (dirty) {
			Setting.setValue('notes.perFolderSortOrders', { ...this.perFolderSortOrders });
		}
	}

	private static setSharedSortOrder(field: string, reverse: boolean) {
		let dirty = false;
		if (this.sharedSortOrder.field !== field) {
			this.sharedSortOrder.field = field;
			dirty = true;
		}
		if (this.sharedSortOrder.reverse !== reverse) {
			this.sharedSortOrder.reverse = reverse;
			dirty = true;
		}
		if (this.sharedSortOrder[field] !== reverse) {
			this.sharedSortOrder[field] = reverse;
			dirty = true;
		}
		if (dirty) {
			Setting.setValue('notes.sharedSortOrder', { ...this.sharedSortOrder });
		}
	}
}
