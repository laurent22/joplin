import produce from 'immer';
import { LayoutItem } from './types';
import validateLayout from './validateLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function setLayoutItemProps(layout: LayoutItem, key: string, props: any) {
	return validateLayout(produce(layout, (draftState: LayoutItem) => {
		function recurseFind(item: LayoutItem) {
			if (item.key === key) {
				for (const n in props) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
