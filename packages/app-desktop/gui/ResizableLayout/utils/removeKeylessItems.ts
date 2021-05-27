import produce from 'immer';
import iterateItems from './iterateItems';
import { LayoutItem } from './types';
import validateLayout from './validateLayout';

interface ItemToRemove {
	parent: LayoutItem;
	index: number;
}

export default function(layout: LayoutItem): LayoutItem {
	const itemsToRemove: ItemToRemove[] = [];

	const output = produce(layout, (layoutDraft: LayoutItem) => {
		iterateItems(layoutDraft, (itemIndex: number, item: LayoutItem, parent: LayoutItem) => {
			if (!item.key) itemsToRemove.push({ parent, index: itemIndex });
			return true;
		});

		itemsToRemove.sort((a: ItemToRemove, b: ItemToRemove) => {
			return a.index > b.index ? -1 : +1;
		});

		for (const item of itemsToRemove) {
			item.parent.children.splice(item.index, 1);
		}
	});

	return output !== layout ? validateLayout(output) : layout;
}
