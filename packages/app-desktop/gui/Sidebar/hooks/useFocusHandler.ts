import { RefObject, useEffect, useRef } from 'react';
import { ListItem } from '../types';
import ItemList from '../../ItemList';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	itemListRef: RefObject<ItemList<ListItem>>;
	selectedListElement: HTMLElement|null;
	selectedIndex: number;
}

const useFocusHandler = (props: Props) => {
	const { itemListRef, selectedListElement, selectedIndex } = props;

	const shouldFocusNextSelectedItem = useRef(false);

	useEffect(() => {
		if (!itemListRef.current) return;

		const hasFocus = !!itemListRef.current.container.querySelector(':scope :focus');
		shouldFocusNextSelectedItem.current = hasFocus;

		itemListRef.current.makeItemIndexVisible(selectedIndex);
	}, [selectedIndex, itemListRef]);

	useEffect(() => {
		if (!shouldFocusNextSelectedItem.current || !selectedListElement) return;
		focus('NotebookAndTagList', selectedListElement);
		shouldFocusNextSelectedItem.current = false;
	}, [selectedListElement]);
};

export default useFocusHandler;
