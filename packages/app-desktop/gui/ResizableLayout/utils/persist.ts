import { LayoutItem, Size } from './types';
import produce from 'immer';
import iterateItems from './iterateItems';
import validateLayout from './validateLayout';

export function saveLayout(layout: LayoutItem): any {
	const propertyWhiteList = [
		'visible',
		'width',
		'height',
		'children',
		'key',
		'context',
	];

	return produce(layout, (draft: any) => {
		delete draft.width;
		delete draft.height;
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
			for (const k of Object.keys(item)) {
				if (!propertyWhiteList.includes(k)) delete (item as any)[k];
			}
			return true;
		});
	});
}

export function loadLayout(layout: any, defaultLayout: LayoutItem, rootSize: Size): LayoutItem {
	let output: LayoutItem = null;

	if (layout) {
		output = { ...layout };
	} else {
		output = { ...defaultLayout };
	}

	output.width = rootSize.width;
	output.height = rootSize.height;

	return validateLayout(output);
}
