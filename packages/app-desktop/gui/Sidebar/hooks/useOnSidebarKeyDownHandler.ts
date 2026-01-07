import { Dispatch } from 'redux';
import { ListItem, ListItemType, SetSelectedIndexCallback } from '../types';
import { KeyboardEventHandler, useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import toggleHeader from './utils/toggleHeader';

interface Props {
	dispatch: Dispatch;
	listItems: ListItem[];
	collapsedFolderIds: string[];
	selectedIndex: number;
	selectedIndexes: number[];
	updateSelectedIndex: SetSelectedIndexCallback;
}

const isToggleShortcut = (keyCode: string, selectedItem: ListItem, collapsedFolderIds: string[]) => {
	if (selectedItem.kind !== ListItemType.Header && selectedItem.kind !== ListItemType.Folder) {
		return false;
	}

	if (!['Space', 'ArrowLeft', 'ArrowRight'].includes(keyCode)) {
		return false;
	}

	if (!selectedItem.hasChildren) {
		return false;
	}

	if (keyCode === 'Space') {
		return true;
	}

	const isCollapsed = 'expanded' in selectedItem ? !selectedItem.expanded : collapsedFolderIds.includes(selectedItem.folder.id);
	return (keyCode === 'ArrowRight') === isCollapsed;
};

const getParentOffset = (childIndex: number, listItems: ListItem[]): number|null => {
	const childItem = listItems[childIndex];
	const targetDepth = childItem.depth - 1;

	let indexChange = 0;
	for (let i = childIndex; i >= 0; i--) {
		const otherItem = listItems[i];
		if (otherItem.depth === targetDepth) {
			return indexChange;
		}
		indexChange --;
	}

	return null;
};

const findNextTypeAheadMatch = (selectedIndex: number, query: string, listItems: ListItem[]) => {
	const normalize = (text: string) => text.trim().toLowerCase();
	const matches = (item: ListItem) => {
		return normalize(item.label).startsWith(normalize(query));
	};

	const indexBefore = listItems.slice(0, selectedIndex).findIndex(matches);
	// Search in all results **after** the current. This prevents the current item from
	// always being identified as the next match, if the user repeatedly presses the
	// same key.
	const startAfter = selectedIndex + 1;
	let indexAfter = listItems.slice(startAfter).findIndex(matches);
	if (indexAfter !== -1) {
		indexAfter += startAfter;
	}
	// Prefer jumping to the next match, rather than the previous
	const matchingIndex = indexAfter !== -1 ? indexAfter : indexBefore;
	return matchingIndex;
};

const useOnSidebarKeyDownHandler = (props: Props) => {
	const { updateSelectedIndex, listItems, selectedIndex, selectedIndexes, collapsedFolderIds, dispatch } = props;

	return useCallback<KeyboardEventHandler<HTMLElement>>((event) => {
		const selectedItem = listItems[selectedIndex];
		let indexChange = 0;

		const ctrlAltOrMeta = event.ctrlKey || event.altKey || event.metaKey;

		if (selectedItem && isToggleShortcut(event.code, selectedItem, collapsedFolderIds)) {
			event.preventDefault();

			if (selectedItem.kind === ListItemType.Folder) {
				dispatch({
					type: 'FOLDER_TOGGLE',
					id: selectedItem.folder.id,
				});
			} else if (selectedItem.kind === ListItemType.Header) {
				toggleHeader(selectedItem.id);
			}
		} else if (selectedItem && event.code === 'ArrowLeft') { // Jump to parent
			const isFolderWithParent = selectedItem.kind === ListItemType.Folder && selectedItem.folder.parent_id;
			// For now, only allow this shortcut for folders with parents -- jumping to the tags or
			// folders headers could be confusing.
			if (isFolderWithParent) {
				indexChange = getParentOffset(selectedIndex, listItems) ?? 0;
			}
		} else if (selectedItem?.hasChildren && event.code === 'ArrowRight') { // Jump to first child
			indexChange = 1;
		} else if (event.code === 'ArrowUp') {
			indexChange = -1;
		} else if (event.code === 'ArrowDown') {
			indexChange = 1;
		} else if ((event.ctrlKey || event.metaKey) && event.code === 'KeyA') { // ctrl+a or cmd+a
			event.preventDefault();
		} else if (event.code === 'Home') {
			event.preventDefault();
			updateSelectedIndex(0, { extend: false });
			indexChange = 0;
		} else if (event.code === 'End') {
			event.preventDefault();
			updateSelectedIndex(listItems.length - 1, { extend: false });
			indexChange = 0;
		} else if (event.code === 'Escape' && selectedIndexes.length > 1) {
			event.preventDefault();
			updateSelectedIndex(selectedIndex, { extend: false });
		} else if (event.code === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void CommandService.instance().execute('focusElement', 'noteList');
		} else if (selectedIndex && selectedIndex >= 0 && event.key.length === 1 && !ctrlAltOrMeta) {
			const nextMatch = findNextTypeAheadMatch(selectedIndex, event.key, listItems);
			if (nextMatch !== -1) {
				indexChange = nextMatch - selectedIndex;
			}
		}

		if (indexChange !== 0) {
			event.preventDefault();
			updateSelectedIndex(selectedIndex + indexChange, { extend: event.shiftKey });
		}
	}, [selectedIndex, selectedIndexes, collapsedFolderIds, listItems, updateSelectedIndex, dispatch]);
};

export default useOnSidebarKeyDownHandler;
