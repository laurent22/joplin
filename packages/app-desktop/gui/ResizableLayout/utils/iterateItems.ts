import { LayoutItem } from './types';

type ItemItemCallback = (itemIndex: number, item: LayoutItem, parent: LayoutItem)=> boolean;

export default function iterateItems(layout: LayoutItem, callback: ItemItemCallback) {
	const result = callback(0, layout, null);
	if (result === false) return;

	function recurseFind(item: LayoutItem, callback: Function): boolean {
		if (item.children) {
			for (let childIndex = 0; childIndex < item.children.length; childIndex++) {
				const child = item.children[childIndex];
				if (callback(childIndex, child, item) === false) return false;
				if (recurseFind(child, callback) === false) return false;
			}
		}
		return true;
	}

	if (recurseFind(layout, callback) === false) return;
}
