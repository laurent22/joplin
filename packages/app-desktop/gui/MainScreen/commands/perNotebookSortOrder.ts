import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { State } from '@joplin/lib/reducer';
import app from '../../../app';
import eventManager from '@joplin/lib/eventManager';
import {
	notesSortOrderFieldArray, NOTES_SORT_ORDER_SWITCH, SETTING_FIELD, SETTING_REVERSE, SETTING_PER_FIELD_REVERSAL_ENABLED
} from './notesSortOrderSwitch';
import { _ } from '@joplin/lib/locale';


export const PER_NOTEBOOK_SORT_ORDER = 'perNotebookSortOrder';
export const SETTING_PER_NOTEBOOK_SORT_ORDER_ENABLED = 'notes.perNotebookSortOrderEnabled';

let previousNotebookId: string = null;
let ownSortOrders: { [key: string]: any } = null;
const sharedSortOrder: { [key: string]: any } = {
	field: 'user_updated_time',
	reverse: true,
	user_updated_time: true,
	user_created_time: true,
	title: false,
	order: false,
};

export function selectedNotebookHasOwnSortOrder() {
	return hasOwnSortOrder(getSelectedNotebookId());
}

export function hasOwnSortOrder(notebookId: string) {
	return notebookId && ownSortOrders && ownSortOrders.hasOwnProperty(notebookId + SUFFIX_FIELD);
}

export const declaration: CommandDeclaration = {
	name: PER_NOTEBOOK_SORT_ORDER,
	label: () => _('Toggle own sort order'),
};

export const runtime = (): CommandRuntime => {
	loadOwnSortOrders();
	loadSharedSortOrder();
	eventManager.appStateOn('notesParentType', onNotebookSelectionMayChange);
	eventManager.appStateOn('selectedFolderId', onNotebookSelectionMayChange);

	return {
		enabledCondition: 'oneFolderSelected',

		execute: async (context: CommandContext, notebookId?: string, own?: boolean) => {
			let targetId = notebookId;
			const selectedId = getSelectedNotebookId(context.state);
			if (!targetId) {
				targetId = selectedId; // default: selected notebook
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
}

function onNotebookSelectionMayChange() {
	const selectedId = getSelectedNotebookId();
	if (previousNotebookId === null) previousNotebookId = selectedId;
	if (previousNotebookId === selectedId) return;
	const field = getCurrentField();
	const reverse = getCurrentReverse();
	const previousNotebookHasOwnSortOrder = hasOwnSortOrder(previousNotebookId);
	if (previousNotebookHasOwnSortOrder) {
		setOwnSortOrder(previousNotebookId, field, reverse);
	} else {
		setSharedSortOrder(field, reverse);
	}
	previousNotebookId = selectedId;
	let next;
	if (hasOwnSortOrder(selectedId)) {
		next = getOwnSortOrder(selectedId);
	} else if (previousNotebookHasOwnSortOrder) {
		next = sharedSortOrder;
	} else {
		return;
	}
	if (perNotebookSortOrderEnabled()) {
		if (next.field != field || next.reverse != reverse) {
			CommandService.instance().execute(NOTES_SORT_ORDER_SWITCH, next.field, next.reverse);
		}
	}
}

const OWN_SORT_ORDERS = 'notes.perNotebookSortOrders';
const SHARED_SORT_ORDER = 'notes.sharedSortOrder';
const SUFFIX_FIELD = '$field';
const SUFFIX_REVERSE = '$reverse';

function getSelectedNotebookId(state?: State): string {
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

function perNotebookSortOrderEnabled(): boolean {
	return Setting.value(SETTING_PER_NOTEBOOK_SORT_ORDER_ENABLED);
}

function getOwnSortOrder(notebookId: string) {
	const field = ownSortOrders[notebookId + SUFFIX_FIELD] as string;
	const reverse = ownSortOrders[notebookId + SUFFIX_REVERSE] as boolean;
	return { field, reverse };
}

function setOwnSortOrder(notebookId: string, field: string, reverse: boolean) {
	const old = getOwnSortOrder(notebookId);
	let dirty = false;
	if (old.field !== field) {
		ownSortOrders[notebookId + SUFFIX_FIELD] = field;
		dirty = true;
	}
	if (old.reverse !== reverse) {
		ownSortOrders[notebookId + SUFFIX_REVERSE] = reverse;
		dirty = true;
	}
	if (dirty) {
		Setting.setValue(OWN_SORT_ORDERS, { ...ownSortOrders });
	}
}

function deleteOwnSortOrder(notebookId: string) {
	let dirty = false;
	if (ownSortOrders.hasOwnProperty(notebookId + SUFFIX_FIELD)) {
		delete ownSortOrders[notebookId + SUFFIX_FIELD];
		dirty = true;
	}
	if (ownSortOrders.hasOwnProperty(notebookId + SUFFIX_REVERSE)) {
		delete ownSortOrders[notebookId + SUFFIX_REVERSE];
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
