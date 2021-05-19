import { useMemo } from 'react';
import { LayoutItem, Size } from './types';

const dragBarThickness = 5;
const itemMinWidth = 40;
const itemMinHeight = 40;

export interface LayoutItemSizes {
	[key: string]: {
		min: Size;
		max: Size;
		current: Size;
	};
}

// Container always take the full space while the items within it need to
// accomodate for the resize handle.
export function itemSize(item: LayoutItem, parent: LayoutItem | null, sizes: LayoutItemSizes, isContainer: boolean): Size {
	const parentResizableRight = !!parent && parent.resizableRight;
	const parentResizableBottom = !!parent && parent.resizableBottom;

	const rightGap = !isContainer && (item.resizableRight || parentResizableRight) ? dragBarThickness : 0;
	const bottomGap = !isContainer && (item.resizableBottom || parentResizableBottom) ? dragBarThickness : 0;

	return {
		width: sizes[item.key].current.width - rightGap,
		height: sizes[item.key].current.height - bottomGap,
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

	// The minimum space required for items with no defined size
	let noWidthChildrenMinWidth = 0;
	let noHeightChildrenMinHeight = 0;

	for (const child of item.children) {
		let w = 'width' in child ? child.width : null;
		let h = 'height' in child ? child.height : null;
		if (!makeAllVisible && child.visible === false) {
			w = 0;
			h = 0;
		}

		sizes[child.key] = {
			min: {
				width: child.minWidth || itemMinWidth,
				height: child.minHeight || itemMinHeight,
			},
			max: { width: w, height: h },
			current: { width: w, height: h },
		};

		if (w !== null) remainingSize.width -= w;
		if (h !== null) remainingSize.height -= h;
		if (w === null) {
			noWidthChildren.push({ item: child, parent: item });
			noWidthChildrenMinWidth += child.minWidth || itemMinWidth;
		}
		if (h === null) {
			noHeightChildren.push({ item: child, parent: item });
			noHeightChildrenMinHeight += child.minHeight || itemMinHeight;
		}
	}

	if (remainingSize.width < noWidthChildrenMinWidth) {
		// There is not enough space, the largest item will be made smaller
		let widestChild = item.children[0].key;
		for (const child of item.children) {
			if (!child.visible) continue;
			if (sizes[child.key].current.width > sizes[widestChild].current.width) widestChild = child.key;
		}

		const dw = Math.abs(remainingSize.width - noWidthChildrenMinWidth);
		sizes[widestChild].current.width -= dw;
		sizes[widestChild].max.width -= dw;
		remainingSize.width += dw;
	}

	if (remainingSize.height < noHeightChildrenMinHeight) {
		let tallestChild = item.children[0].key;
		for (const child of item.children) {
			if (!child.visible) continue;
			if (sizes[child.key].current.height > sizes[tallestChild].current.height) tallestChild = child.key;
		}

		const dh = Math.abs(remainingSize.height - noHeightChildrenMinHeight);
		sizes[tallestChild].current.height -= dh;
		sizes[tallestChild].max.height -= dh;
		remainingSize.height += dh;
	}

	if (noWidthChildren.length) {
		const w = item.direction === 'row' ? Math.floor(remainingSize.width / noWidthChildren.length) : parentSize.width;
		for (const child of noWidthChildren) {
			const finalWidth = w;
			sizes[child.item.key].current.width = finalWidth;
		}
	}

	if (noHeightChildren.length) {
		const h = item.direction === 'column' ? Math.floor(remainingSize.height / noHeightChildren.length) : parentSize.height;
		for (const child of noHeightChildren) {
			const finalHeight = h;
			sizes[child.item.key].current.height = finalHeight;
		}
	}

	for (const child of item.children) {
		// This will be used by Resizable to limit the item sizes while resizing
		sizes[child.key].max.width += remainingSize.width - noWidthChildrenMinWidth;
		sizes[child.key].max.height += remainingSize.height - noHeightChildrenMinHeight;

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
			min: { width: layout.width, height: layout.height },
			max: { width: layout.width, height: layout.height },
			current: { width: layout.width, height: layout.height },
		};

		sizes = calculateChildrenSizes(layout, null, sizes, makeAllVisible);

		return sizes;
	}, [layout, makeAllVisible]);
}
