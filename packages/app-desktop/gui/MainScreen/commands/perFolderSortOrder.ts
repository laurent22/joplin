import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { State } from '@joplin/lib/reducer';
import app from '../../../app';
import eventManager from '@joplin/lib/eventManager';
import {
	notesSortOrderFieldArray, NOTES_SORT_ORDER_SWITCH, SETTING_FIELD, SETTING_REVERSE, SETTING_PER_FIELD_REVERSAL_ENABLED,
} from './notesSortOrderSwitch';
import { _ } from '@joplin/lib/locale';


export const PER_FOLDER_SORT_ORDER = 'perFolderSortOrder';
export const SETTING_PER_FOLDER_SORT_ORDER_ENABLED = 'notes.perFolderSortOrderEnabled';

let previousFolderId: string = null;
let ownSortOrders: { [key: string]: any } = null;
const sharedSortOrder: { [key: string]: any } = {
	field: 'user_updated_time',
	reverse: true,
	user_updated_time: true,
	user_created_time: true,
	title: false,
	order: false,
};

export function selectedFolderHasOwnSortOrder() {
	return hasOwnSortOrder(getSelectedFolderId());
}

export function hasOwnSortOrder(folderId: string) {
	return folderId && ownSortOrders && ownSortOrders.hasOwnProperty(folderId + SUFFIX_FIELD);
}

export const declaration: CommandDeclaration = {
	name: PER_FOLDER_SORT_ORDER,
	label: () => _('Toggle own sort order'),
};

export const runtime = (): CommandRuntime => {
	loadOwnSortOrders();
	loadSharedSortOrder();
	eventManager.appStateOn('notesParentType', onFolderSelectionMayChange);
	eventManager.appStateOn('selectedFolderId', onFolderSelectionMayChange);

	return {
		enabledCondition: 'oneFolderSelected',

		execute: async (context: CommandContext, folderId?: string, own?: boolean) => {
			let targetId = folderId;
			const selectedId = getSelectedFolderId(context.state);
			if (!targetId) {
				targetId = selectedId; // default: selected folder
				if (!targetId) return;
			}
			const targetOwn = hasOwnSortOrder(targetId);
			let newOwn;
			if (typeof own == 'undefined') {
				newOwn = !targetOwn; // default: toggling
			} else {
				newOwn = !!own;
				if (newOwn === targetOwn) return;
			}
			if (newOwn) {
				let field: string, reverse: boolean;
				if (!hasOwnSortOrder(selectedId)) {
					field = getCurrentField();
					reverse = getCurrentReverse();
				} else {
					field = sharedSortOrder.field;
					if (perFieldReversalEnabled()) {
						reverse = sharedSortOrder[field];
					} else {
						reverse = sharedSortOrder.reverse;
					}
				}
				setOwnSortOrder(targetId, field, reverse);
			} else {
				deleteOwnSortOrder(targetId);
			}
		},
	};
};

function onFolderSelectionMayChange() {
	const selectedId = getSelectedFolderId();
	if (previousFolderId === null) previousFolderId = selectedId;
	if (previousFolderId === selectedId) return;
	const field = getCurrentField();
	const reverse = getCurrentReverse();
	const previousFolderHasOwnSortOrder = hasOwnSortOrder(previousFolderId);
	if (previousFolderHasOwnSortOrder) {
		setOwnSortOrder(previousFolderId, field, reverse);
	} else {
		setSharedSortOrder(field, reverse);
	}
	previousFolderId = selectedId;
	let next;
	if (hasOwnSortOrder(selectedId)) {
		next = getOwnSortOrder(selectedId);
	} else if (previousFolderHasOwnSortOrder) {
		next = sharedSortOrder;
	} else {
		return;
	}
	if (perFolderSortOrderEnabled()) {
		if (next.field != field || next.reverse != reverse) {
			void CommandService.instance().execute(NOTES_SORT_ORDER_SWITCH, next.field, next.reverse);
		}
	}
}

const OWN_SORT_ORDERS = 'notes.perFolderSortOrders';
const SHARED_SORT_ORDER = 'notes.sharedSortOrder';
const SUFFIX_FIELD = '$field';
const SUFFIX_REVERSE = '$reverse';

function getSelectedFolderId(state?: State): string {
	const s = state ? state : app().store().getState();
	if (s.notesParentType === 'Folder') {
		return s.selectedFolderId;
	} else {
		return '';
	}
}

function getCurrentField(): string {
	return Setting.value(SETTING_FIELD);
}

function getCurrentReverse(): boolean {
	return Setting.value(SETTING_REVERSE);
}

function perFieldReversalEnabled(): boolean {
	return Setting.value(SETTING_PER_FIELD_REVERSAL_ENABLED);
}

function perFolderSortOrderEnabled(): boolean {
	return Setting.value(SETTING_PER_FOLDER_SORT_ORDER_ENABLED);
}

function getOwnSortOrder(folderId: string) {
	const field = ownSortOrders[folderId + SUFFIX_FIELD] as string;
	const reverse = ownSortOrders[folderId + SUFFIX_REVERSE] as boolean;
	return { field, reverse };
}

function setOwnSortOrder(folderId: string, field: string, reverse: boolean) {
	const old = getOwnSortOrder(folderId);
	let dirty = false;
	if (old.field !== field) {
		ownSortOrders[folderId + SUFFIX_FIELD] = field;
		dirty = true;
	}
	if (old.reverse !== reverse) {
		ownSortOrders[folderId + SUFFIX_REVERSE] = reverse;
		dirty = true;
	}
	if (dirty) {
		Setting.setValue(OWN_SORT_ORDERS, { ...ownSortOrders });
	}
}

function deleteOwnSortOrder(folderId: string) {
	let dirty = false;
	if (ownSortOrders.hasOwnProperty(folderId + SUFFIX_FIELD)) {
		delete ownSortOrders[folderId + SUFFIX_FIELD];
		dirty = true;
	}
	if (ownSortOrders.hasOwnProperty(folderId + SUFFIX_REVERSE)) {
		delete ownSortOrders[folderId + SUFFIX_REVERSE];
		dirty = true;
	}
	if (dirty) {
		Setting.setValue(OWN_SORT_ORDERS, { ...ownSortOrders });
	}
}

function loadOwnSortOrders() {
	ownSortOrders = { ...Setting.value(OWN_SORT_ORDERS) };
}

function loadSharedSortOrder() {
	const validFields = notesSortOrderFieldArray();
	const value = Setting.value(SHARED_SORT_ORDER);
	for (const key in sharedSortOrder) {
		if (value.hasOwnProperty(key)) {
			if (key !== 'field' || validFields.includes(value.field)) {
				sharedSortOrder[key] = value[key];
			}
		}
	}
}

function setSharedSortOrder(field: string, reverse: boolean) {
	let dirty = false;
	if (sharedSortOrder.field !== field) {
		sharedSortOrder.field = field;
		dirty = true;
	}
	if (sharedSortOrder.reverse !== reverse) {
		sharedSortOrder.reverse = reverse;
		dirty = true;
	}
	if (sharedSortOrder[field] !== reverse) {
		sharedSortOrder[field] = reverse;
		dirty = true;
	}
	if (dirty) {
		Setting.setValue(SHARED_SORT_ORDER, { ...sharedSortOrder });
	}
}
