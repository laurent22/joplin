import { useMemo } from 'react';
import { LayoutItem, Size, dragBarThickness } from '../ResizableLayout';

export interface LayoutItemSizes {
	[key: string]: Size;
}

export function itemSize(item: LayoutItem, sizes: LayoutItemSizes): Size {
	return {
		width: 'width' in item ? item.width : sizes[item.key].width,
		height: 'height' in item ? item.height : sizes[item.key].height,
	};
}

function calculateChildrenSizes(item: LayoutItem, sizes: LayoutItemSizes): LayoutItemSizes {
	if (!item.children) return sizes;

	const parentSize = itemSize(item, sizes);

	const remainingSize: Size = {
		width: parentSize.width,
		height: parentSize.height,
	};

	const noWidthChildren: LayoutItem[] = [];
	const noHeightChildren: LayoutItem[] = [];

	for (const child of item.children) {
		let w = 'width' in child ? child.width : null;
		let h = 'height' in child ? child.height : null;
		if (child.visible === false) {
			w = 0;
			h = 0;
		}

		if (item.resizableRight) w -= dragBarThickness;
		if (item.resizableBottom) h -= dragBarThickness;

		sizes[child.key] = { width: w, height: h };
		if (w !== null) remainingSize.width -= w;
		if (h !== null) remainingSize.height -= h;
		if (w === null) noWidthChildren.push(child);
		if (h === null) noHeightChildren.push(child);
	}

	if (noWidthChildren.length) {
		const w = item.direction === 'row' ? remainingSize.width / noWidthChildren.length : parentSize.width;
		for (const child of noWidthChildren) {
			sizes[child.key].width = w;
		}
	}

	if (noHeightChildren.length) {
		const h = item.direction === 'column' ? remainingSize.height / noHeightChildren.length : parentSize.height;
		for (const child of noHeightChildren) {
			sizes[child.key].height = h;
		}
	}

	for (const child of item.children) {
		const childrenSizes = calculateChildrenSizes(child, sizes);
		sizes = { ...sizes, ...childrenSizes };
	}

	return sizes;
}

export default function useLayoutItemSizes(layout: LayoutItem) {
	return useMemo(() => {
		let sizes: LayoutItemSizes = {};

		if (!('width' in layout) || !('height' in layout)) throw new Error('width and height are required on layout root');

		sizes[layout.key] = {
			width: layout.width,
			height: layout.height,
		};

		sizes = calculateChildrenSizes(layout, sizes);

		return sizes;
	}, [layout]);
}
