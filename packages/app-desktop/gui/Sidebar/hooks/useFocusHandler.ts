import { RefObject, useEffect, useMemo, useRef } from 'react';
import { ListItem } from '../types';
import ItemList from '../../ItemList';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	itemListRef: RefObject<ItemList<ListItem>>;
	selectedListElement: HTMLElement|null;
	selectedIndex: number;
	listItems: ListItem[];
}

const useFocusHandler = (props: Props) => {
	const { itemListRef, selectedListElement, selectedIndex, listItems } = props;

	const shouldFocusNextSelectedItem = useRef(false);

	// We keep track of the key to avoid scrolling unnecessarily. For example, when the
	// selection's index changes because a notebook is expanded/collapsed, we don't necessarily
	// want to scroll the selection into view.
	const selectedItemKey = useMemo(() => {
		if (selectedIndex >= 0 && selectedIndex < listItems.length) {
			return listItems[selectedIndex].key;
		} else {
			return undefined;
		}
	}, [listItems, selectedIndex]);

	const selectedIndexRef = useRef(selectedIndex);
	selectedIndexRef.current = selectedIndex;

	useEffect(() => {
		if (!itemListRef.current || !selectedItemKey) return;

		const hasFocus = !!itemListRef.current.container.querySelector(':scope :focus');
		shouldFocusNextSelectedItem.current = hasFocus;

		if (hasFocus) {
			itemListRef.current.makeItemIndexVisible(selectedIndexRef.current);
		}
	}, [selectedItemKey, itemListRef]);

	useEffect(() => {
		if (!shouldFocusNextSelectedItem.current || !selectedListElement) return;
		focus('NotebookAndTagList', selectedListElement);
		shouldFocusNextSelectedItem.current = false;
	}, [selectedListElement]);
};

export default useFocusHandler;
