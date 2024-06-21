import { LayoutItem, Size } from './types';
import produce from 'immer';
import iterateItems from './iterateItems';
import validateLayout from './validateLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function saveLayout(layout: LayoutItem): any {
	const propertyWhiteList = [
		'visible',
		'width',
		'height',
		'children',
		'key',
		'context',
	];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return produce(layout, (draft: any) => {
		delete draft.width;
		delete draft.height;
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
			for (const k of Object.keys(item)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				if (!propertyWhiteList.includes(k)) delete (item as any)[k];
			}
			return true;
		});
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
