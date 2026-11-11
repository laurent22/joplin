import { useMemo } from 'react';
import { LayoutItem, Size } from './types';

const dragBarThickness = 5;

export const itemMinWidth = 40;
export const itemMinHeight = 40;

// Bigger than itemMinWidth: used as a fallback for width-less non-absorber
// siblings so newly-shown panels (moveMode) get a usable width instead of
// squeezing to the minimum.
const nonAbsorberFallbackWidth = 250;
const nonAbsorberFallbackHeight = 250;

export interface LayoutItemSizes {
	[key: string]: Size;
}

function containsFlexibleDescendant(item: LayoutItem): boolean {
	if (item.flexible) return true;
	if (!item.children) return false;
	for (const child of item.children) {
		if (containsFlexibleDescendant(child)) return true;
	}
	return false;
}

// Whether this item's trailing (right/bottom) edge is a divider against a
// visible-in-render sibling. The parent-side flags cover the case where the
// item's edge coincides with an ancestor's divider (e.g. a column-nested item
// inheriting its column container's right edge).
export interface EdgeFlags {
	ownRight: boolean;
	ownBottom: boolean;
	parentRight: boolean;
	parentBottom: boolean;
}

const noEdges: EdgeFlags = { ownRight: false, ownBottom: false, parentRight: false, parentBottom: false };

// Container always take the full space while the items within it need to
// accommodate for the resize handle.
export function itemSize(item: LayoutItem, _parent: LayoutItem | null, sizes: LayoutItemSizes, isContainer: boolean, edges: EdgeFlags = noEdges): Size {
	const rightGap = !isContainer && (edges.ownRight || edges.parentRight) ? dragBarThickness : 0;
	const bottomGap = !isContainer && (edges.ownBottom || edges.parentBottom) ? dragBarThickness : 0;

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

	const noWidthChildren: { item: LayoutItem; parent: LayoutItem }[] = [];
	const noHeightChildren: { item: LayoutItem; parent: LayoutItem }[] = [];

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

	// When several children lack a size on the parent's axis (e.g. in
	// moveMode, where normally-hidden panels are shown without one), route
	// remaining space to the one that carries the flexible descendant and
	// give the others a fallback size. This keeps the absorber's role
	// intact and avoids equal-split behaviour that would eat editor space.
	if (noWidthChildren.length && item.direction === 'row' && noWidthChildren.length > 1) {
		const absorber = noWidthChildren.find(c => containsFlexibleDescendant(c.item));
		if (absorber) {
			const absorberMin = absorber.item.minWidth || itemMinWidth;
			let budget = Math.max(0, remainingSize.width - absorberMin);
			for (const child of noWidthChildren) {
				if (child.item.key === absorber.item.key) continue;
				const min = child.item.minWidth || itemMinWidth;
				const desired = child.item.minWidth || nonAbsorberFallbackWidth;
				const w = Math.max(min, Math.min(desired, budget));
				sizes[child.item.key].width = w;
				budget -= w;
			}
			sizes[absorber.item.key].width = Math.max(absorberMin, remainingSize.width - (noWidthChildren.reduce((sum, c) => c.item.key === absorber.item.key ? sum : sum + sizes[c.item.key].width, 0)));
		} else {
			const w = Math.floor(remainingSize.width / noWidthChildren.length);
			for (const child of noWidthChildren) sizes[child.item.key].width = w;
		}
	} else if (noWidthChildren.length) {
		const w = item.direction === 'row' ? Math.floor(remainingSize.width / noWidthChildren.length) : parentSize.width;
		for (const child of noWidthChildren) sizes[child.item.key].width = w;
	}

	if (noHeightChildren.length && item.direction === 'column' && noHeightChildren.length > 1) {
		const absorber = noHeightChildren.find(c => containsFlexibleDescendant(c.item));
		if (absorber) {
			const absorberMin = absorber.item.minHeight || itemMinHeight;
			let budget = Math.max(0, remainingSize.height - absorberMin);
			for (const child of noHeightChildren) {
				if (child.item.key === absorber.item.key) continue;
				const min = child.item.minHeight || itemMinHeight;
				const desired = child.item.minHeight || nonAbsorberFallbackHeight;
				const h = Math.max(min, Math.min(desired, budget));
				sizes[child.item.key].height = h;
				budget -= h;
			}
			sizes[absorber.item.key].height = Math.max(absorberMin, remainingSize.height - (noHeightChildren.reduce((sum, c) => c.item.key === absorber.item.key ? sum : sum + sizes[c.item.key].height, 0)));
		} else {
			const h = Math.floor(remainingSize.height / noHeightChildren.length);
			for (const child of noHeightChildren) sizes[child.item.key].height = h;
		}
	} else if (noHeightChildren.length) {
		const h = item.direction === 'column' ? Math.floor(remainingSize.height / noHeightChildren.length) : parentSize.height;
		for (const child of noHeightChildren) sizes[child.item.key].height = h;
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
