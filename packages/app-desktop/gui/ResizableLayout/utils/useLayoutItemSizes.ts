import { useMemo } from 'react';
import { LayoutItem, Size } from './types';

const dragBarThickness = 5;

export const itemMinWidth = 40;
export const itemMinHeight = 40;

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
		width: sizes[item.key].width - rightGap,
		height: sizes[item.key].height - bottomGap,
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

		sizes[child.key] = { width: w, height: h };

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

	while (remainingSize.width < noWidthChildrenMinWidth) {
		// There is not enough space, the widest item will be made smaller
		let widestChild = item.children[0].key;
		for (const child of item.children) {
			if (!child.visible) continue;
			if (sizes[child.key].width > sizes[widestChild].width) widestChild = child.key;
		}

		const dw = Math.abs(remainingSize.width - noWidthChildrenMinWidth);
		sizes[widestChild].width -= dw;
		remainingSize.width += dw;
	}

	while (remainingSize.height < noHeightChildrenMinHeight) {
		// There is not enough space, the tallest item will be made smaller
		let tallestChild = item.children[0].key;
		for (const child of item.children) {
			if (!child.visible) continue;
			if (sizes[child.key].height > sizes[tallestChild].height) tallestChild = child.key;
		}

		const dh = Math.abs(remainingSize.height - noHeightChildrenMinHeight);
		sizes[tallestChild].height -= dh;
		remainingSize.height += dh;
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

// Gives the maximum available space for this item that it can take up during resizing
// availableSize = totalSize - ( [size of items with set size, except for the current item] + [minimum size of items with no set size] )
export function calculateMaxSizeAvailableForItem(item: LayoutItem, parent: LayoutItem, sizes: LayoutItemSizes): Size {
	const availableSize: Size = { ...sizes[parent.key] };

	for (const sibling of parent.children) {
		if (!sibling.visible) continue;

		availableSize.width -= 'width' in sibling ? sizes[sibling.key].width : (sibling.minWidth || itemMinWidth);
		availableSize.height -= 'height' in sibling ? sizes[sibling.key].height : (sibling.minHeight || itemMinHeight);
	}

	availableSize.width += sizes[item.key].width;
	availableSize.height += sizes[item.key].height;

	return availableSize;
}

export default function useLayoutItemSizes(layout: LayoutItem, makeAllVisible = false) {
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
