import { LayoutItem } from './types';
import produce from 'immer';
import iterateItems from './iterateItems';

export default function(layout:LayoutItem):LayoutItem {
	const keptProperties = [
		'visible',
		'width',
		'height',
		'children',
		'key',
	];

	return produce(layout, (draft:any) => {
		delete draft.width;
		delete draft.height;
		iterateItems(draft, (_itemIndex:number, item:LayoutItem, _parent:LayoutItem) => {
			for (const k of Object.keys(item)) {
				if (!keptProperties.includes(k)) delete (item as any)[k];
			}
			return true;
		});
	});
}
