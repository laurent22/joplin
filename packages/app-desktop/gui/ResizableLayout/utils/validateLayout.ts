import produce from 'immer';
import iterateItems from './iterateItems';
import { LayoutItem, LayoutItemDirection } from './types';

function isLastVisible(itemIndex: number, item: LayoutItem, parent: LayoutItem) {
	if (item.visible === false) return false;

	for (let i = parent.children.length - 1; i >= 0; i--) {
		const child = parent.children[i];
		if (child && child.visible !== false) return i === itemIndex;
	}

	return false;
}

function updateItemSize(itemIndex: number, itemDraft: LayoutItem, parent: LayoutItem) {
	if (!parent) return;

	// If a container has only one child, this child should not
	// have a width and height, and simply fill up the container
	if (parent.children.length === 1) {
		delete itemDraft.width;
		delete itemDraft.height;
	}

	// If all children of a container have a fixed width, the
	// latest visible child should have a flexible width (i.e. no "width"
	// property), so that it fills up the remaining space
	if (isLastVisible(itemIndex, itemDraft, parent)) {
		let allChildrenAreSized = true;
		for (const child of parent.children) {
			if (child.visible === false) continue;

			if (parent.direction === LayoutItemDirection.Row) {
				if (!child.width) {
					allChildrenAreSized = false;
					break;
				}
			} else {
				if (!child.height) {
					allChildrenAreSized = false;
					break;
				}
			}
		}

		if (allChildrenAreSized) {
			if (parent.direction === LayoutItemDirection.Row) {
				delete itemDraft.width;
			} else {
				delete itemDraft.height;
			}
		}
	}
}

// All items should be resizable, except for the root and the latest visible child
// of a container.
function updateResizeRules(itemIndex: number, itemDraft: LayoutItem, parent: LayoutItem) {
	if (!parent) return;
	const isLastVisibleChild = isLastVisible(itemIndex, itemDraft, parent);
	itemDraft.resizableRight = parent.direction === LayoutItemDirection.Row && !isLastVisibleChild;
	itemDraft.resizableBottom = parent.direction === LayoutItemDirection.Column && !isLastVisibleChild;
}

// Container direction should alternate between row (for the root) and
// columns, then rows again.
function updateDirection(_itemIndex: number, itemDraft: LayoutItem, parent: LayoutItem) {
	if (!parent) {
		itemDraft.direction = LayoutItemDirection.Row;
	} else {
		itemDraft.direction = parent.direction === LayoutItemDirection.Row ? LayoutItemDirection.Column : LayoutItemDirection.Row;
	}
}

function itemShouldBeVisible(item: LayoutItem): boolean {
	if (!item.children) return item.visible !== false;

	let oneIsVisible = false;

	for (const child of item.children) {
		if (itemShouldBeVisible(child)) {
			oneIsVisible = true;
			break;
		}
	}

	return oneIsVisible;
}

// If all children of a container are hidden, the container should be
// hidden too. A container visibility cannot be changed by the user.
function updateContainerVisibility(_itemIndex: number, itemDraft: LayoutItem, _parent: LayoutItem) {
	if (itemDraft.children) {
		itemDraft.visible = itemShouldBeVisible(itemDraft);
	} else {
		itemDraft.visible = itemDraft.visible !== false;
	}
}

export default function validateLayout(layout: LayoutItem): LayoutItem {
	if (!layout) throw new Error('Layout is null');
	if (!layout.children || !layout.children.length) throw new Error('Root does not have children');

	return produce(layout, (draft: LayoutItem) => {
		draft.isRoot = true;

		iterateItems(draft, (itemIndex: number, itemDraft: LayoutItem, parent: LayoutItem) => {
			updateItemSize(itemIndex, itemDraft, parent);
			updateResizeRules(itemIndex, itemDraft, parent);
			updateDirection(itemIndex, itemDraft, parent);
			updateContainerVisibility(itemIndex, itemDraft, parent);
			return true;
		});
	});
}
