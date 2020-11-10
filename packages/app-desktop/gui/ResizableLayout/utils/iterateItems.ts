import { LayoutItem } from './types';

export default function iterateItems(layout:LayoutItem, callback:Function) {
	const result = callback(layout, null);
	if (result === false) return;

	function recurseFind(item:LayoutItem, callback:Function):boolean {
		if (item.children) {
			for (const child of item.children) {
				if (callback(child, item) === false) return false;
				if (recurseFind(child, callback) === false) return false;
			}
		}
		return true;
	}

	if (recurseFind(layout, callback) === false) return;
}
