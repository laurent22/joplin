import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { ListItem } from '../types';
import ItemList from '../../ItemList';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	itemListRef: RefObject<ItemList<ListItem>>;
	selectedIndex: number;
	listItems: ListItem[];
}

const useScrollToSelectionHandler = (
	itemListRef: RefObject<ItemList<ListItem>>,
	listItems: ListItem[],
	selectedIndex: number,
) => {
	// We keep track of the key to avoid scrolling unnecessarily. For example, when the
	// selection's index changes because a notebook is expanded/collapsed, we don't necessarily
	// want to scroll the selection into view.
	const lastSelectedItemKey = useRef('');
	const selectedItemKey = useMemo(() => {
		if (selectedIndex >= 0 && selectedIndex < listItems.length) {
			return listItems[selectedIndex].key;
		} else {
			// When nothing is selected, re-use the key from before.
			// This prevents the view from scrolling when a dropdown containing the
			// selection is closed, then opened again.
			return lastSelectedItemKey.current;
		}
	}, [listItems, selectedIndex]);
	lastSelectedItemKey.current = selectedItemKey;

	const selectedIndexRef = useRef(selectedIndex);
	selectedIndexRef.current = selectedIndex;

	useEffect(() => {
		if (!itemListRef.current || !selectedItemKey) return;

		const hasFocus = !!itemListRef.current.container.contains(document.activeElement);

		if (hasFocus) {
			itemListRef.current.makeItemIndexVisible(selectedIndexRef.current);
		}
	}, [selectedItemKey, itemListRef]);
};

const useFocusHandler = (props: Props) => {
	const { itemListRef, selectedIndex, listItems } = props;

	useScrollToSelectionHandler(itemListRef, listItems, selectedIndex);

	const focusSidebar = useCallback(() => {
		if (!itemListRef.current.isIndexVisible(selectedIndex)) {
			itemListRef.current.makeItemIndexVisible(selectedIndex);
		}

		const focusableItem = itemListRef.current.container.querySelector('[role="treeitem"][tabindex="0"]');
		const focusableContainer = itemListRef.current.container.querySelector('[role="tree"][tabindex="0"]');
		if (focusableItem) {
			focus('FolderAndTagList/focusSidebarItem', focusableItem);
		} else if (focusableContainer) {
			// Handles the case where no items in the tree can be focused.
			focus('FolderAndTagList/focusSidebarTree', focusableContainer);
		}
	}, [selectedIndex, itemListRef]);

	return { focusSidebar };
};

export default useFocusHandler;
