import { LayoutItem, Size } from './types';
import { produce } from 'immer';
import iterateItems from './iterateItems';
import validateLayout from './validateLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function saveLayout(layout: LayoutItem): any {
	const propertyWhiteList = [
		'visible',
		'width',
		'height',
		'minWidth',
		'minHeight',
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

function backfillMinWidth(persisted: LayoutItem, defaultLayout: LayoutItem): LayoutItem {
	if (!persisted || !defaultLayout) return persisted;

	const result = { ...persisted };

	if (result.minWidth === undefined && defaultLayout.minWidth !== undefined) {
		result.minWidth = defaultLayout.minWidth;
	}

	if (Array.isArray(result.children) && Array.isArray(defaultLayout.children)) {
		result.children = result.children.map((child: LayoutItem) => {
			const matchingDefault = defaultLayout.children.find(
				(d: LayoutItem) => d.key === child?.key,
			);
			return matchingDefault ? backfillMinWidth(child, matchingDefault) : child;
		});
	}

	return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function loadLayout(layout: any, defaultLayout: LayoutItem, rootSize: Size): LayoutItem {
	let output: LayoutItem = null;

	if (layout) {
		output = backfillMinWidth(layout, defaultLayout);
	} else {
		output = { ...defaultLayout };
	}

	output.width = rootSize.width;
	output.height = rootSize.height;

	return validateLayout(output);
}
