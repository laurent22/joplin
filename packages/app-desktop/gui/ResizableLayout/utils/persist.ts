import { LayoutItem, Size } from './types';
import { produce } from 'immer';
import iterateItems from './iterateItems';
import scaleLayoutItemSizes from './scaleLayoutItemSizes';
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

	const rootSize = {
		width: layout.width,
		height: layout.height,
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return produce(layout, (draft: any) => {
		draft.context = {
			...draft.context,
			savedRootSize: rootSize,
		};
		delete draft.width;
		delete draft.height;
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, _parent: LayoutItem) => {
			for (const k of Object.keys(item)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				if (!propertyWhiteList.includes(k)) delete (item as any)[k];
			}

			if (item.context?.autoSize) {
				delete item.context.autoSize;
				if (!Object.keys(item.context).length) delete item.context;
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

	const validated = validateLayout(output);
	const savedRootSize = output?.context?.savedRootSize as Size | undefined;

	if (savedRootSize && savedRootSize.width > 0 && savedRootSize.height > 0) {
		const widthRatio = rootSize.width / savedRootSize.width;
		const heightRatio = rootSize.height / savedRootSize.height;
		return scaleLayoutItemSizes(validated, rootSize, widthRatio, heightRatio);
	}

	return validated;
}
