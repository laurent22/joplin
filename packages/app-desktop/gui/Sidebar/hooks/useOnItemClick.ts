import { MouseEvent } from 'react';
import { ModelType } from '@joplin/lib/BaseModel';
import { RefObject, useCallback } from 'react';
import { Dispatch } from 'redux';
import { ListItem, ListItemType } from '../types';
import shim from '@joplin/lib/shim';

export interface ItemClickEvent {
	id: string;
	type: ModelType;
	event: MouseEvent;
}

interface Props {
	itemsRef: RefObject<ListItem[]>;
	selectedIndexesRef: RefObject<number[]>;
	dispatch: Dispatch;
}

const listItemToId = (item: ListItem) => {
	if (item.kind === ListItemType.Tag) return item.tag.id;
	if (item.kind === ListItemType.Folder) return item.folder.id;
	return null;
};

const useOnItemClick = ({ dispatch, selectedIndexesRef, itemsRef }: Props) => {
	return useCallback(({ id, type, event }: ItemClickEvent) => {
		const action = type === ModelType.Folder ? 'FOLDER_SELECT' : 'TAG_SELECT';
		const selectedIndexes = selectedIndexesRef.current;
		const findItemIndex = () => itemsRef.current.findIndex(item => listItemToId(item) === id);

		if (event.shiftKey && selectedIndexes.length > 0) {
			const index = findItemIndex();
			if (index === -1) throw new Error(`No item found with ID: ${id}`);

			const lastAddedIndex = selectedIndexes[selectedIndexes.length - 1];
			const indexStart = Math.min(index, lastAddedIndex);
			const indexStop = Math.max(index, lastAddedIndex);
			const itemIds = itemsRef.current.slice(indexStart, indexStop + 1)
				.map(listItemToId)
				.filter(id => !!id);

			dispatch({
				type: `${action}_ADD`,
				ids: itemIds,
			});
		} else if (shim.isMac() ? event.metaKey : event.ctrlKey) {
			const index = findItemIndex();
			// Don't allow unselecting all items: Keep at least one item selected
			const canDeselect = selectedIndexes.length > 1;
			const actionType = canDeselect && selectedIndexes.includes(index) ? 'REMOVE' : 'ADD';
			dispatch({
				type: `${action}_${actionType}`,
				id: id,
			});
		} else {
			dispatch({
				type: action,
				id: id,
			});
		}
	}, [dispatch, selectedIndexesRef, itemsRef]);
};

export default useOnItemClick;
