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
	updateSelectedIndex: SetSelectedIndexCallback;
}


const isToggleShortcut = (keyCode: string, selectedItem: ListItem, collapsedFolderIds: string[]) => {
	if (selectedItem.kind !== ListItemType.Header && selectedItem.kind !== ListItemType.Folder) {
		return false;
	}

	if (!['Space', 'ArrowLeft', 'ArrowRight'].includes(keyCode)) {
		return false;
	}

	if (keyCode === 'Space') {
		return true;
	}

	const isCollapsed = 'expanded' in selectedItem ? !selectedItem.expanded : collapsedFolderIds.includes(selectedItem.folder.id);
	return (keyCode === 'ArrowRight') === isCollapsed;
};

const useOnSidebarKeyDownHandler = (props: Props) => {
	const { updateSelectedIndex, listItems, selectedIndex, collapsedFolderIds, dispatch } = props;

	return useCallback<KeyboardEventHandler<HTMLElement>>((event) => {
		const selectedItem = listItems[selectedIndex];
		let indexChange = 0;

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
		} else if ((event.ctrlKey || event.metaKey) && event.code === 'KeyA') { // ctrl+a or cmd+a
			event.preventDefault();
		} else if (event.code === 'ArrowUp') {
			indexChange = -1;
		} else if (event.code === 'ArrowDown') {
			indexChange = 1;
		} else if (event.code === 'Tab') {
			event.preventDefault();

			if (event.shiftKey) {
				void CommandService.instance().execute('focusElement', 'noteBody');
			} else {
				void CommandService.instance().execute('focusElement', 'noteList');
			}
		}

		if (indexChange !== 0) {
			event.preventDefault();
			updateSelectedIndex(selectedIndex + indexChange);
		}
	}, [selectedIndex, collapsedFolderIds, listItems, updateSelectedIndex, dispatch]);
};

export default useOnSidebarKeyDownHandler;
