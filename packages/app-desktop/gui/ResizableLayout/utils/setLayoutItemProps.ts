import produce from 'immer';
import { LayoutItem } from './types';
import validateLayout from './validateLayout';

export default function setLayoutItemProps(layout: LayoutItem, key: string, props: any) {
	return validateLayout(produce(layout, (draftState: LayoutItem) => {
		function recurseFind(item: LayoutItem) {
			if (item.key === key) {
				for (const n in props) {
					(item as any)[n] = props[n];
				}
			} else {
				if (item.children) {
					for (const child of item.children) {
						recurseFind(child);
					}
				}
			}
		}

		recurseFind(draftState);
	}));
}
