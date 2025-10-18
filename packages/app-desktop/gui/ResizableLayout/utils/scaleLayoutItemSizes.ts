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

interface AutoSizeContext {
	naturalWidth?: number;
	naturalHeight?: number;
}

function ensureContext(item: LayoutItem) {
	if (!item.context) item.context = {};
	return item.context;
}

function ensureAutoSizeContext(item: LayoutItem): AutoSizeContext {
	const context = ensureContext(item);
	if (!context.autoSize) context.autoSize = {};
	return context.autoSize as AutoSizeContext;
}

export default function scaleLayoutItemSizes(layout: LayoutItem, newRootSize: Size, widthRatio: number, heightRatio: number): LayoutItem {
	const ratioX = safeRatio(widthRatio);
	const ratioY = safeRatio(heightRatio);

	const scaledLayout = produce(layout, (draft: LayoutItem) => {
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, parent: LayoutItem) => {
			if (!parent) {
				item.width = newRootSize.width;
				item.height = newRootSize.height;
				const context = ensureContext(item);
				context.savedRootSize = {
					width: newRootSize.width,
					height: newRootSize.height,
				};
				return true;
			}

			const autoSize = ensureAutoSizeContext(item);

			if (parent.direction === LayoutItemDirection.Row) {
				const hasExplicitWidth = typeof item.width === 'number';
				if (!hasExplicitWidth && typeof autoSize.naturalWidth !== 'number') {
					autoSize.naturalWidth = undefined;
					return true;
				}

				const baseWidth = typeof autoSize.naturalWidth === 'number' ? autoSize.naturalWidth : (hasExplicitWidth ? item.width : null);
				if (typeof baseWidth !== 'number') {
					autoSize.naturalWidth = undefined;
					return true;
				}

				const minimumWidth = item.minWidth || itemMinWidth;
				const scaledWidth = baseWidth * ratioX;
				autoSize.naturalWidth = scaledWidth;
				item.width = clamp(scaledWidth, minimumWidth);
			} else if (parent.direction === LayoutItemDirection.Column) {
				const hasExplicitHeight = typeof item.height === 'number';
				if (!hasExplicitHeight && typeof autoSize.naturalHeight !== 'number') {
					autoSize.naturalHeight = undefined;
					return true;
				}

				const baseHeight = typeof autoSize.naturalHeight === 'number' ? autoSize.naturalHeight : (hasExplicitHeight ? item.height : null);
				if (typeof baseHeight !== 'number') {
					autoSize.naturalHeight = undefined;
					return true;
				}

				const minimumHeight = item.minHeight || itemMinHeight;
				const scaledHeight = baseHeight * ratioY;
				autoSize.naturalHeight = scaledHeight;
				item.height = clamp(scaledHeight, minimumHeight);
			}

			if (item.context?.autoSize) {
				const hasNaturalWidth = typeof item.context.autoSize.naturalWidth === 'number';
				const hasNaturalHeight = typeof item.context.autoSize.naturalHeight === 'number';
				if (!hasNaturalWidth && !hasNaturalHeight) {
					delete item.context.autoSize;
					if (!Object.keys(item.context).length) delete item.context;
				}
			}

			return true;
		});
	});

	return validateLayout(scaledLayout);
}
