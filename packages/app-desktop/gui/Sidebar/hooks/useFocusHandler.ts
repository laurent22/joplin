import { MutableRefObject, RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { ListItem } from '../types';
import ItemList from '../../ItemList';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	itemListRef: RefObject<ItemList<ListItem>>;
	selectedListElement: HTMLElement|null;
	selectedIndex: number;
	listItems: ListItem[];
}

const useFocusAfterNextRenderHandler = (
	shouldFocusAfterNextRender: MutableRefObject<boolean>,
	selectedListElement: HTMLElement|null,
) => {
	useEffect(() => {
		if (!shouldFocusAfterNextRender.current || !selectedListElement) return;
		focus('FolderAndTagList/useFocusHandler/afterRender', selectedListElement);
		shouldFocusAfterNextRender.current = false;
	}, [selectedListElement, shouldFocusAfterNextRender]);
};

const useRefocusOnSelectionChangeHandler = (
	itemListRef: RefObject<ItemList<ListItem>>,
	shouldFocusAfterNextRender: MutableRefObject<boolean>,
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

		const hasFocus = !!itemListRef.current.container.querySelector(':scope :focus');
		shouldFocusAfterNextRender.current = hasFocus;

		if (hasFocus) {
			itemListRef.current.makeItemIndexVisible(selectedIndexRef.current);
		}
	}, [selectedItemKey, itemListRef, shouldFocusAfterNextRender]);
};

const useFocusHandler = (props: Props) => {
	const { itemListRef, selectedListElement, selectedIndex, listItems } = props;

	// When set to true, when selectedListElement next changes, select it.
	const shouldFocusAfterNextRender = useRef(false);

	useRefocusOnSelectionChangeHandler(itemListRef, shouldFocusAfterNextRender, listItems, selectedIndex);
	useFocusAfterNextRenderHandler(shouldFocusAfterNextRender, selectedListElement);

	const focusSidebar = useCallback(() => {
		if (!selectedListElement || !itemListRef.current.isIndexVisible(selectedIndex)) {
			itemListRef.current.makeItemIndexVisible(selectedIndex);
			shouldFocusAfterNextRender.current = true;
		} else {
			focus('FolderAndTagList/useFocusHandler/focusSidebar', selectedListElement);
		}
	}, [selectedListElement, selectedIndex, itemListRef]);

	return { focusSidebar };
};

export default useFocusHandler;
