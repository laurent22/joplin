// Pure helpers extracted from ResizableLayout so they can be unit-tested
// without a React harness. Everything here is state-in / state-out — no
// re-resizable, no DOM, no hooks.

import { EdgeFlags, itemMinWidth, itemMinHeight } from './useLayoutItemSizes';
import { LayoutItem, LayoutItemDirection } from './types';

export function isItemVisibleInRender(item: LayoutItem, moveMode: boolean): boolean {
	if (moveMode) return true;
	if (item.children && !item.children.length) return false;
	return item.visible !== false;
}

// The subtree carries an absorber if any node in it is flagged flexible.
export function isSubtreeFlexible(item: LayoutItem): boolean {
	if (item.flexible) return true;
	if (!item.children) return false;
	for (const child of item.children) {
		if (isSubtreeFlexible(child)) return true;
	}
	return false;
}

// The first visible-in-render sibling after `item` in `parent.children`, or
// null when `item` is the last visible child (or has no parent).
export function nextVisibleSibling(item: LayoutItem, parent: LayoutItem | null, moveMode: boolean): LayoutItem | null {
	if (!parent || !parent.children) return null;
	const idx = parent.children.findIndex(c => c.key === item.key);
	for (let i = idx + 1; i < parent.children.length; i++) {
		if (isItemVisibleInRender(parent.children[i], moveMode)) return parent.children[i];
	}
	return null;
}

// The index of the last visible-in-render child of `item`, or -1.
export function lastVisibleChildIndex(item: LayoutItem, moveMode: boolean): number {
	if (!item.children) return -1;
	for (let i = item.children.length - 1; i >= 0; i--) {
		if (isItemVisibleInRender(item.children[i], moveMode)) return i;
	}
	return -1;
}

const zeroEdges: EdgeFlags = { ownRight: false, ownBottom: false, parentRight: false, parentBottom: false };

// Compute an item's edge flags from its parent's direction, its own position
// (is it the last visible child?), and the parent's own edges. Same-axis
// nesting is handled: a last-child of a row-in-row inherits both the outer's
// own right gap and the outer's inherited parentRight.
export function computeEdges(parent: LayoutItem | null, isLastChild: boolean, parentEdges: EdgeFlags = zeroEdges): EdgeFlags {
	const parentDir = parent?.direction;
	const ownRight = parentDir === LayoutItemDirection.Row && !isLastChild;
	const ownBottom = parentDir === LayoutItemDirection.Column && !isLastChild;
	const parentRight = parentDir === LayoutItemDirection.Column
		? parentEdges.ownRight || parentEdges.parentRight
		: (isLastChild && (parentEdges.ownRight || parentEdges.parentRight));
	const parentBottom = parentDir === LayoutItemDirection.Row
		? parentEdges.ownBottom || parentEdges.parentBottom
		: (isLastChild && (parentEdges.ownBottom || parentEdges.parentBottom));
	return { ownRight, ownBottom, parentRight, parentBottom };
}

export interface ResizeStartSnapshot {
	key: string;
	initialWidth: number;
	initialHeight: number;
	nextSiblingKey: string | null;
	nextSiblingInitialWidth: number;
	nextSiblingInitialHeight: number;
	itemAbsorbsAlongAxis: { width: boolean; height: boolean };
	nextAbsorbsAlongAxis: { width: boolean; height: boolean };
}

// Build the drag-start snapshot from the layout state. This captures which
// side of the divider counts as the absorber on each axis (only truly
// flexible subtrees do — an unsized panel that isn't flagged still gets
// deltas applied to it so drags on newly-shown panels behave normally).
export function buildResizeSnapshot(
	item: LayoutItem,
	parent: LayoutItem | null,
	moveMode: boolean,
	sizes: { [key: string]: { width: number; height: number } },
): ResizeStartSnapshot {
	const next = nextVisibleSibling(item, parent, moveMode);
	const itemFlex = isSubtreeFlexible(item);
	const nextFlex = next ? isSubtreeFlexible(next) : false;

	return {
		key: item.key,
		initialWidth: sizes[item.key].width,
		initialHeight: sizes[item.key].height,
		nextSiblingKey: next?.key ?? null,
		nextSiblingInitialWidth: next ? sizes[next.key].width : 0,
		nextSiblingInitialHeight: next ? sizes[next.key].height : 0,
		itemAbsorbsAlongAxis: {
			width: itemFlex && !('width' in item),
			height: itemFlex && !('height' in item),
		},
		nextAbsorbsAlongAxis: {
			width: nextFlex && next ? !('width' in next) : false,
			height: nextFlex && next ? !('height' in next) : false,
		},
	};
}

export interface ResizeUpdate {
	key: string;
	props: { width?: number; height?: number };
}

// Given a drag snapshot, a direction, and re-resizable's cumulative delta,
// return the layout-state writes needed to move the divider. The dragged
// panel and its next visible sibling exchange space; either side can be
// skipped when it's an absorber so the layout system keeps it flexible.
// When both sides are absorbers (e.g. two unsized column-nested siblings),
// we write to the dragged panel so the divider still moves.
export function planResize(
	snapshot: ResizeStartSnapshot,
	direction: string,
	delta: { width: number; height: number },
): ResizeUpdate[] {
	const isHorizontal = direction !== 'bottom';
	const minSize = isHorizontal ? itemMinWidth : itemMinHeight;
	const rawDelta = isHorizontal ? delta.width : delta.height;

	const itemIsAbsorber = isHorizontal ? snapshot.itemAbsorbsAlongAxis.width : snapshot.itemAbsorbsAlongAxis.height;
	const nextIsAbsorber = isHorizontal ? snapshot.nextAbsorbsAlongAxis.width : snapshot.nextAbsorbsAlongAxis.height;
	const bothAbsorb = itemIsAbsorber && nextIsAbsorber;

	const writeItem = !itemIsAbsorber || bothAbsorb;
	const writeNext = !nextIsAbsorber && !!snapshot.nextSiblingKey;

	const itemInitial = isHorizontal ? snapshot.initialWidth : snapshot.initialHeight;
	const nextInitial = isHorizontal ? snapshot.nextSiblingInitialWidth : snapshot.nextSiblingInitialHeight;

	// When both panels are written, clamp a single shared delta against both
	// minimums so their combined size is preserved. When only one side is
	// written, the other is absorbing and we don't clamp against it.
	let effectiveDelta = rawDelta;
	if (writeItem) effectiveDelta = Math.max(effectiveDelta, minSize - itemInitial);
	if (writeNext) effectiveDelta = Math.min(effectiveDelta, nextInitial - minSize);

	const updates: ResizeUpdate[] = [];
	if (writeItem) {
		const newSize = itemInitial + effectiveDelta;
		updates.push({ key: snapshot.key, props: isHorizontal ? { width: newSize } : { height: newSize } });
	}
	if (writeNext) {
		const newSize = nextInitial - effectiveDelta;
		updates.push({ key: snapshot.nextSiblingKey, props: isHorizontal ? { width: newSize } : { height: newSize } });
	}

	return updates;
}
