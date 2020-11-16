import { useMemo } from 'react';
import { LayoutItem, Size } from './types';

const dragBarThickness = 5;

export interface LayoutItemSizes {
	[key: string]: Size;
}

// Container always take the full space while the items within it need to
// accomodate for the resize handle.
export function itemSize(item: LayoutItem, parent: LayoutItem | null, sizes: LayoutItemSizes, isContainer: boolean): Size {
	const parentResizableRight = !!parent && parent.resizableRight;
	const parentResizableBottom = !!parent && parent.resizableBottom;

	const rightGap = !isContainer && (item.resizableRight || parentResizableRight) ? dragBarThickness : 0;
	const bottomGap = !isContainer && (item.resizableBottom || parentResizableBottom) ? dragBarThickness : 0;

	return {
		width: ('width' in item ? item.width : sizes[item.key].width) - rightGap,
		height: ('height' in item ? item.height : sizes[item.key].height) - bottomGap,
	};
}

// This calculate the size of each item within the layout. However
// the final size, as rendered by the component is determined by
// `itemSize()`, as it takes into account the resizer handle
function calculateChildrenSizes(item: LayoutItem, parent: LayoutItem | null, sizes: LayoutItemSizes, makeAllVisible: boolean): LayoutItemSizes {
	if (!item.children) return sizes;

	const parentSize = itemSize(item, parent, sizes, true);

	const remainingSize: Size = {
		width: parentSize.width,
		height: parentSize.height,
	};

	const noWidthChildren: any[] = [];
	const noHeightChildren: any[] = [];

	for (const child of item.children) {
		let w = 'width' in child ? child.width : null;
		let h = 'height' in child ? child.height : null;
		if (!makeAllVisible && child.visible === false) {
			w = 0;
			h = 0;
		}

		sizes[child.key] = { width: w, height: h };
		if (w !== null) remainingSize.width -= w;
		if (h !== null) remainingSize.height -= h;
		if (w === null) noWidthChildren.push({ item: child, parent: item });
		if (h === null) noHeightChildren.push({ item: child, parent: item });
	}

	if (noWidthChildren.length) {
		const w = item.direction === 'row' ? Math.floor(remainingSize.width / noWidthChildren.length) : parentSize.width;
		for (const child of noWidthChildren) {
			const finalWidth = w;
			sizes[child.item.key].width = finalWidth;
		}
	}

	if (noHeightChildren.length) {
		const h = item.direction === 'column' ? Math.floor(remainingSize.height / noHeightChildren.length) : parentSize.height;
		for (const child of noHeightChildren) {
			const finalHeight = h;
			sizes[child.item.key].height = finalHeight;
		}
	}

	for (const child of item.children) {
		const childrenSizes = calculateChildrenSizes(child, parent, sizes, makeAllVisible);
		sizes = { ...sizes, ...childrenSizes };
	}

	return sizes;
}

export default function useLayoutItemSizes(layout: LayoutItem, makeAllVisible: boolean = false) {
	return useMemo(() => {
		let sizes: LayoutItemSizes = {};

		if (!('width' in layout) || !('height' in layout)) throw new Error('width and height are required on layout root');

		sizes[layout.key] = {
			width: layout.width,
			height: layout.height,
		};

		sizes = calculateChildrenSizes(layout, null, sizes, makeAllVisible);

		return sizes;
	}, [layout, makeAllVisible]);
}
