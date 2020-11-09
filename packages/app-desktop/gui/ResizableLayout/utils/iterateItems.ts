import { LayoutItem } from './types';

export default function iterateItems(layout:LayoutItem, callback:Function) {
	callback(layout, null);

	function recurseFind(item:LayoutItem, callback:Function) {
		if (item.children) {
			for (const child of item.children) {
				callback(child, item);
				recurseFind(child, callback);
			}
		}
	}

	recurseFind(layout, callback);
}
