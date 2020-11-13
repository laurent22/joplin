import findItemByKey from './findItemByKey';
import { LayoutItem } from './types';

export default function layoutItemProp(layout: LayoutItem, key: string, propName: string) {
	const item = findItemByKey(layout, key);
	return (item as any)[propName];
}
