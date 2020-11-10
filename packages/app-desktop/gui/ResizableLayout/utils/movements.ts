/* eslint-disable import/prefer-default-export */

import iterateItems from './iterateItems';
import { LayoutItem, LayoutItemDirection } from './types';
import produce from 'immer';

function array_move(arr:any[], old_index:number, new_index:number) {
	arr = arr.slice();
	if (new_index >= arr.length) {
		let k = new_index - arr.length + 1;
		while (k--) {
			arr.push(undefined);
		}
	}
	arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
	return arr; // for testing
}

function findItemIndex(siblings:LayoutItem[], key:string) {
	return siblings.findIndex((value:LayoutItem) => {
		return value.key === key;
	});
}

export function moveHorizontal(layout:LayoutItem, key:string, inc:number):LayoutItem {
	const itemParents:Record<string, LayoutItem> = {};

	return produce(layout, (draft:any) => {
		iterateItems(draft, (item:LayoutItem, parent:LayoutItem) => {
			itemParents[item.key] = parent;

			if (item.key !== key || !parent) return true;

			const itemIndex = findItemIndex(parent.children, key);

			if (parent.direction === LayoutItemDirection.Row) {
				const newIndex = itemIndex + inc;

				if (newIndex >= parent.children.length || newIndex < 0) throw new Error(`Cannot move item "${key}" from position ${itemIndex} to ${newIndex}`);

				if (parent.children[newIndex].children) {
					const newParent = parent.children[newIndex];
					parent.children.splice(itemIndex, 1);
					newParent.children.push(item);
				} else {
					parent.children = array_move(parent.children, itemIndex, newIndex);
				}
			} else { // Column
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
