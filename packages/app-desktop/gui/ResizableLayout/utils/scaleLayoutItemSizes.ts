import { produce } from 'immer';
import iterateItems from './iterateItems';
import { LayoutItem, LayoutItemDirection, Size } from './types';
import { itemMinHeight, itemMinWidth } from './useLayoutItemSizes';
import validateLayout from './validateLayout';

function clamp(value: number, minimum: number) {
	return Math.max(minimum, Math.round(value));
}

function safeRatio(value: number) {
	if (!Number.isFinite(value) || value <= 0) return 1;
	return value;
}

export default function scaleLayoutItemSizes(layout: LayoutItem, newRootSize: Size, widthRatio: number, heightRatio: number): LayoutItem {
	const ratioX = safeRatio(widthRatio);
	const ratioY = safeRatio(heightRatio);

	const scaledLayout = produce(layout, (draft: LayoutItem) => {
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, parent: LayoutItem) => {
			if (!parent) {
				item.width = newRootSize.width;
				item.height = newRootSize.height;
				return true;
			}

			if (parent.direction === LayoutItemDirection.Row) {
				if (typeof item.width === 'number') {
					const minimumWidth = item.minWidth || itemMinWidth;
					item.width = clamp(item.width * ratioX, minimumWidth);
				}
			} else if (parent.direction === LayoutItemDirection.Column) {
				if (typeof item.height === 'number') {
					const minimumHeight = item.minHeight || itemMinHeight;
					item.height = clamp(item.height * ratioY, minimumHeight);
				}
			}

			return true;
		});
	});

	return validateLayout(scaledLayout);
}
