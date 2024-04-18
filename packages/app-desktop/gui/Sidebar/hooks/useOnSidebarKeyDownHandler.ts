import { Dispatch } from 'redux';
import { ListItem, ListItemType, SetSelectedIndexCallback } from '../types';
import { KeyboardEventHandler, useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	dispatch: Dispatch;
	sidebarData: ListItem[];
	selectedIndex: number;
	updateSelectedIndex: SetSelectedIndexCallback;
}

const useOnSidebarKeyDownHandler = (props: Props) => {
	const { updateSelectedIndex, sidebarData, selectedIndex, dispatch } = props;

	return useCallback<KeyboardEventHandler<HTMLElement>>((event) => {
		const selectedItem = sidebarData[selectedIndex];
		if (selectedItem && selectedItem.kind === ListItemType.Notebook && event.code === 'Space') {
			event.preventDefault();

			dispatch({
				type: 'FOLDER_TOGGLE',
				id: selectedItem.folder.id,
			});
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
	}, [selectedIndex, sidebarData, updateSelectedIndex, dispatch]);
};

export default useOnSidebarKeyDownHandler;
