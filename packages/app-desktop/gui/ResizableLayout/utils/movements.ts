/* eslint-disable import/prefer-default-export */

import iterateItems from './iterateItems';
import { LayoutItem, LayoutItemDirection } from './types';
import produce from 'immer';

enum MovementDirection {
	Horizontal = 1,
	Vertical = 2,
}

function array_move(arr:any[], old_index:number, new_index:number) {
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

function findItemIndex(siblings:LayoutItem[], key:string) {
	return siblings.findIndex((value:LayoutItem) => {
		return value.key === key;
	});
}

function moveItem(direction:MovementDirection, layout:LayoutItem, key:string, inc:number):LayoutItem {
	const itemParents:Record<string, LayoutItem> = {};

	return produce(layout, (draft:any) => {
		iterateItems(draft, (item:LayoutItem, parent:LayoutItem) => {
			itemParents[item.key] = parent;

			if (item.key !== key || !parent) return true;

			const itemIndex = findItemIndex(parent.children, key);

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

				if (parent.children[newIndex].children) {
					const newParent = parent.children[newIndex];
					parent.children.splice(itemIndex, 1);
					newParent.children.push(item);
				} else {
					parent.children = array_move(parent.children, itemIndex, newIndex);
				}
			} else {
				parent.children.splice(itemIndex, 1);

				const parentParent = itemParents[parent.key];
				const parentIndex = findItemIndex(parentParent.children, parent.key);
				const newItemIndex = parentIndex + inc;

				parentParent.children.splice(newItemIndex, 0, item);
			}

			return false;
		});
	});
}

export function moveHorizontal(layout:LayoutItem, key:string, inc:number):LayoutItem {
	return moveItem(MovementDirection.Horizontal, layout, key, inc);
}

export function moveVertical(layout:LayoutItem, key:string, inc:number):LayoutItem {
	return moveItem(MovementDirection.Vertical, layout, key, inc);
}
