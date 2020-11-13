import produce from 'immer';
import iterateItems from './iterateItems';
import { LayoutItem } from './types';
import validateLayout from './validateLayout';

export default function(layout: LayoutItem, itemKey: string): LayoutItem {
	const output = produce(layout, (layoutDraft: LayoutItem) => {
		iterateItems(layoutDraft, (itemIndex: number, item: LayoutItem, parent: LayoutItem) => {
			if (item.key === itemKey) {
				parent.children.splice(itemIndex, 1);
				return false;
			}
			return true;
		});
	});

	return output !== layout ? validateLayout(output) : layout;
}
