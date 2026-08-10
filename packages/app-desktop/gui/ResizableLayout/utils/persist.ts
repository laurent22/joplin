import { LayoutItem, Size } from './types';
import { produce } from 'immer';
import iterateItems from './iterateItems';
import validateLayout from './validateLayout';

export function saveLayout(layout: LayoutItem): Partial<LayoutItem> {
	const propertyWhiteList = [
		'visible',
		'width',
		'height',
		'children',
		'key',
		'context',
		'flexible',
	];

	return produce(layout, (draft: LayoutItem) => {
		delete draft.width;
		delete draft.height;
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
			for (const k of Object.keys(item)) {
				if (!propertyWhiteList.includes(k)) delete (item as unknown as Record<string, unknown>)[k];
			}
			return true;
		});
	});
}

export function loadLayout(layout: Partial<LayoutItem> | null, defaultLayout: LayoutItem, rootSize: Size): LayoutItem {
	let output: LayoutItem = null;

	if (layout) {
		output = { ...layout } as LayoutItem;
	} else {
		output = { ...defaultLayout };
	}

	output.width = rootSize.width;
	output.height = rootSize.height;

	return validateLayout(output);
}
