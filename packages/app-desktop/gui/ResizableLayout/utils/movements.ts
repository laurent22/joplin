import iterateItems from './iterateItems';
import { LayoutItem, LayoutItemDirection, tempContainerPrefix } from './types';
import produce from 'immer';
import uuid from '@joplin/lib/uuid';
import validateLayout from './validateLayout';

export enum MoveDirection {
	Up = 'up',
	Down = 'down',
	Left = 'left',
	Right = 'right',
}

enum MovementDirection {
	Horizontal = 1,
	Vertical = 2,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function array_move(arr: any[], old_index: number, new_index: number) {
	arr = arr.slice();
	if (new_index >= arr.length) {
		let k = new_index - arr.length + 1;
		while (k--) {
			arr.push(undefined);
		}
	}
	arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
	return arr;
}

function findItemIndex(siblings: LayoutItem[], key: string) {
	return siblings.findIndex((value: LayoutItem) => {
		return value.key === key;
	});
}

function isHorizontalMove(direction: MoveDirection) {
	return direction === MoveDirection.Left || direction === MoveDirection.Right;
}

function resetItemSizes(items: LayoutItem[]) {
	return items.map((item: LayoutItem) => {
		const newItem = { ...item };
		delete newItem.width;
		delete newItem.height;
		return newItem;
	});
}

export function canMove(direction: MoveDirection, item: LayoutItem, parent: LayoutItem) {
	if (!parent) return false;

	if (isHorizontalMove(direction)) {
		if (parent.isRoot) {
			const idx = direction === MoveDirection.Left ? 0 : parent.children.length - 1;
			return parent.children[idx] !== item;
		} else if (parent.direction === LayoutItemDirection.Column) {
			return true;
		}
	} else {
		if (parent.isRoot) {
			return false;
		} else if (parent.direction === LayoutItemDirection.Column) {
			const idx = direction === MoveDirection.Up ? 0 : parent.children.length - 1;
			return parent.children[idx] !== item;
		}
	}

	throw new Error('Unhandled case');
}

// For all movements we make the assumption that there's a root container,
// which is a row of multiple columns. Within each of these columns there
// can be multiple rows (one item per row). Items cannot be more deeply
// nested.
function moveItem(direction: MovementDirection, layout: LayoutItem, key: string, inc: number): LayoutItem {
	const itemParents: Record<string, LayoutItem> = {};

	const itemIsRoot = (item: LayoutItem) => {
		return !itemParents[item.key];
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const updatedLayout = produce(layout, (draft: any) => {
		iterateItems(draft, (itemIndex: number, item: LayoutItem, parent: LayoutItem) => {
			itemParents[item.key] = parent;

			if (item.key !== key || !parent) return true;

			// - "flow" means we are moving an item horizontally within a
			//   row
			// - "contrary" means we are moving an item horizontally within
			//   a column. Sicen it can't move horizontally, it is moved
			//   out of its container. And vice-versa for vertical
			//   movements.
			let moveType = null;

			if (direction === MovementDirection.Horizontal && parent.direction === LayoutItemDirection.Row) moveType = 'flow';
			if (direction === MovementDirection.Horizontal && parent.direction === LayoutItemDirection.Column) moveType = 'contrary';
			if (direction === MovementDirection.Vertical && parent.direction === LayoutItemDirection.Column) moveType = 'flow';
			if (direction === MovementDirection.Vertical && parent.direction === LayoutItemDirection.Row) moveType = 'contrary';

			if (moveType === 'flow') {
				const newIndex = itemIndex + inc;

				if (newIndex >= parent.children.length || newIndex < 0) throw new Error(`Cannot move item "${key}" from position ${itemIndex} to ${newIndex}`);

				// If the item next to it is a container (has children),
				// move the item inside the container
				if (parent.children[newIndex].children) {
					const newParent = parent.children[newIndex];
					parent.children.splice(itemIndex, 1);
					newParent.children.push(item);
					newParent.children = resetItemSizes(newParent.children);
				} else {
					// If the item is a child of the root container, create
					// a new column at `newIndex` and move the item that
					// was there, as well as the current item, in this
					// container.
					if (itemIsRoot(parent)) {
						const targetChild = parent.children[newIndex];

						// The new container takes the size of the item it
						// replaces.
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
						const newSize: any = {};
						if (direction === MovementDirection.Horizontal) {
							if ('width' in targetChild) newSize.width = targetChild.width;
						} else {
							if ('height' in targetChild) newSize.height = targetChild.height;
						}

						const newParent: LayoutItem = {
							key: `${tempContainerPrefix}${uuid.createNano()}`,
							direction: LayoutItemDirection.Column,
							children: [
								targetChild,
								item,
							],
							...newSize,
						};

						parent.children[newIndex] = newParent;
						parent.children.splice(itemIndex, 1);

						newParent.children = resetItemSizes(newParent.children);
					} else {
						// Otherwise the default case is simply to move the
						// item left/right
						parent.children = array_move(parent.children, itemIndex, newIndex);
					}
				}
			} else {
				const parentParent = itemParents[parent.key];
				const parentIndex = findItemIndex(parentParent.children, parent.key);

				parent.children.splice(itemIndex, 1);

				let newInc = inc;
				if (parent.children.length <= 1) {
					parentParent.children[parentIndex] = parent.children[0];
					newInc = inc < 0 ? inc + 1 : inc;
				}

				const newItemIndex = parentIndex + newInc;

				parentParent.children.splice(newItemIndex, 0, item);
				parentParent.children = resetItemSizes(parentParent.children);
			}

			return false;
		});
	});

	return validateLayout(updatedLayout);
}

export function moveHorizontal(layout: LayoutItem, key: string, inc: number): LayoutItem {
	return moveItem(MovementDirection.Horizontal, layout, key, inc);
}

export function moveVertical(layout: LayoutItem, key: string, inc: number): LayoutItem {
	return moveItem(MovementDirection.Vertical, layout, key, inc);
}

export function move(layout: LayoutItem, key: string, direction: MoveDirection): LayoutItem {
	if (direction === MoveDirection.Up) return moveVertical(layout, key, -1);
	if (direction === MoveDirection.Down) return moveVertical(layout, key, +1);
	if (direction === MoveDirection.Left) return moveHorizontal(layout, key, -1);
	if (direction === MoveDirection.Right) return moveHorizontal(layout, key, +1);
	throw new Error('Unreachable');
}
