import Setting from '@joplin/lib/models/Setting';

const SUFFIX_FIELD = '$field';
const SUFFIX_REVERSE = '$reverse';

export interface SortOrder {
	field: string;
	reverse: boolean;
}

interface SortOrderPool {
	[key: string]: string | boolean;
}

export default class PerFolderSortOrderService {

	private static perFolderSortOrders: SortOrderPool = null;

	public static isSet(folderId: string): boolean {
		this.loadPerFolderSortOrders();
		return folderId && this.perFolderSortOrders && this.perFolderSortOrders.hasOwnProperty(folderId + SUFFIX_FIELD);
	}

	public static get(folderId: string): SortOrder | undefined {
		this.loadPerFolderSortOrders();
		if (folderId && this.perFolderSortOrders) {
			const field = this.perFolderSortOrders[folderId + SUFFIX_FIELD] as string;
			const reverse = this.perFolderSortOrders[folderId + SUFFIX_REVERSE] as boolean;
			if (field) return { field, reverse };
		}
		return undefined;
	}

	public static set(folderId: string, enabled: boolean) {
		if (!folderId) return;

		this.loadPerFolderSortOrders();

		if (enabled) {
			const field = Setting.value('notes.sortOrder.field');
			const reverse = Setting.value('notes.sortOrder.reverse');
			this.setPerFolderSortOrder(folderId, field, reverse);
		} else {
			this.deletePerFolderSortOrder(folderId);
		}
	}

	public static setPerFolderSortOrder(folderId: string, field: string, reverse: boolean) {
		this.loadPerFolderSortOrders();
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
		this.loadPerFolderSortOrders();
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

	private static loadPerFolderSortOrders() {
		if (this.perFolderSortOrders === null) {
			this.perFolderSortOrders = { ...Setting.value('notes.perFolderSortOrders') };
		}
	}

	public static reloadPerFolderSortOrders() {
		this.perFolderSortOrders = { ...Setting.value('notes.perFolderSortOrders') };
	}
}
