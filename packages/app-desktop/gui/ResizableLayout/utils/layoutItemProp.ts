import findItemByKey from './findItemByKey';
import { LayoutItem } from './types';

export default function layoutItemProp(layout: LayoutItem, key: string, propName: string) {
	const item = findItemByKey(layout, key);
	if (!item) throw new Error(`Could not find layout item: ${key}`);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (item as any)[propName];
}
