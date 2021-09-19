import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { State } from '@joplin/lib/reducer';
import app from '../../../app';
import eventManager from '@joplin/lib/eventManager';
import { notesSortOrderFieldArray } from './notesSortOrderSwitch';
import { _ } from '@joplin/lib/locale';

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
	name: 'perFolderSortOrder',
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
					field = Setting.value('notes.sortOrder.field');
					reverse = Setting.value('notes.sortOrder.reverse');
				} else {
					field = sharedSortOrder.field;
					if (Setting.value('notes.perFieldReversalEnabled')) {
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
	const field = Setting.value('notes.sortOrder.field');
	const reverse = Setting.value('notes.sortOrder.reverse');
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
	if (Setting.value('notes.perFolderSortOrderEnabled')) {
		if (next.field != field || next.reverse != reverse) {
			void CommandService.instance().execute('notesSortOrderSwitch', next.field, next.reverse);
		}
	}
}

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
		Setting.setValue('notes.perFolderSortOrders', { ...ownSortOrders });
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
		Setting.setValue('notes.perFolderSortOrders', { ...ownSortOrders });
	}
}

function loadOwnSortOrders() {
	ownSortOrders = { ...Setting.value('notes.perFolderSortOrders') };
}

function loadSharedSortOrder() {
	const validFields = notesSortOrderFieldArray();
	const value = Setting.value('notes.sharedSortOrder');
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
		Setting.setValue('notes.sharedSortOrder', { ...sharedSortOrder });
	}
}
