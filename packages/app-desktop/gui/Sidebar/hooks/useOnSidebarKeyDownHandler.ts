import { Dispatch } from 'redux';
import { FolderListItem, ListItem, ListItemType, SetSelectedIndexCallback } from '../types';
import { KeyboardEventHandler, useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	dispatch: Dispatch;
	listItems: ListItem[];
	collapsedFolderIds: string[];
	selectedIndex: number;
	updateSelectedIndex: SetSelectedIndexCallback;
}


const isToggleShortcut = (keyCode: string, selectedItem: FolderListItem, collapsedFolderIds: string[]) => {
	if (!['Space', 'ArrowLeft', 'ArrowRight'].includes(keyCode)) {
		return false;
	}
	if (keyCode === 'Space') {
		return true;
	}

	const isCollapsed = collapsedFolderIds.includes(selectedItem.folder.id);
	return (keyCode === 'ArrowRight') === isCollapsed;
};

const useOnSidebarKeyDownHandler = (props: Props) => {
	const { updateSelectedIndex, listItems, selectedIndex, collapsedFolderIds, dispatch } = props;

	return useCallback<KeyboardEventHandler<HTMLElement>>((event) => {
		const selectedItem = listItems[selectedIndex];
		if (selectedItem?.kind === ListItemType.Folder && isToggleShortcut(event.code, selectedItem, collapsedFolderIds)) {
			event.preventDefault();

			dispatch({
				type: 'FOLDER_TOGGLE',
				id: selectedItem.folder.id,
			});
		}

		if ((event.ctrlKey || event.metaKey) && event.code === 'KeyA') { // ctrl+a or cmd+a
			event.preventDefault();
		}

		let indexChange = 0;
		if (event.code === 'ArrowUp') {
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
