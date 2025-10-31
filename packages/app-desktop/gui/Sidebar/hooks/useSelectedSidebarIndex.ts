import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListItem, ListItemType } from '../types';
import { isFolderSelected, isTagSelected } from '@joplin/lib/components/shared/side-menu-shared';
import { Dispatch } from 'redux';
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');

type UpdateSelectedIndexOptions = { extend: boolean };

interface Props {
	dispatch: Dispatch;
	listItems: ListItem[];

	notesParentType: string;
	selectedTagIds: string[];
	selectedFolderIds: string[];
	selectedSmartFilterId: string;
}

const useSelectedSidebarIndex = (props: Props) => {
	const isIndexSelected = useCallback((index: number) => {
		const listItem = props.listItems[index];

		let selected = false;
		if (listItem.kind === ListItemType.AllNotes) {
			selected = props.selectedSmartFilterId === ALL_NOTES_FILTER_ID && props.notesParentType === 'SmartFilter';
		} else if (listItem.kind === ListItemType.Header || listItem.kind === ListItemType.Spacer) {
			selected = false;
		} else if (listItem.kind === ListItemType.Folder) {
			selected = isFolderSelected(listItem.folder, {
				selectedFolderIds: props.selectedFolderIds,
				notesParentType: props.notesParentType,
			});
		} else if (listItem.kind === ListItemType.Tag) {
			selected = isTagSelected(listItem.tag, { selectedTagIds: props.selectedTagIds, notesParentType: props.notesParentType });
		} else {
			const exhaustivenessCheck: never = listItem;
			return exhaustivenessCheck;
		}

		return selected;
	}, [props.listItems, props.selectedFolderIds, props.selectedTagIds, props.selectedSmartFilterId, props.notesParentType]);

	const appStateSelectedIndexes = useMemo(() => {
		const selectedIndexes = [];
		for (let i = 0; i < props.listItems.length; i++) {
			if (isIndexSelected(i)) {
				selectedIndexes.push(i);
			}
		}
		return selectedIndexes;
	}, [props.listItems, isIndexSelected]);

	const appStateSelectedIndex = appStateSelectedIndexes[0];

	// Not all list items correspond with selectable Joplin folders/tags, but we want to
	// be able to select them anyway. This is handled with selectedIndexOverride.
	//
	// When selectedIndexOverride >= 0, it corresponds to the index of a selected item with no
	// specific note parent item (e.g. a header).
	const [selectedIndexOverride, setSelectedIndexOverride] = useState(-1);
	useEffect(() => {
		setSelectedIndexOverride(-1);
	}, [appStateSelectedIndex]);

	// The main index of all selected indexes. This is where the focus will go.
	// Ignored if not included in appStateSelectedIndexes.
	const [primarySelectedIndex, setPrimarySelectedIndex] = useState(0);

	const updateSelectedIndex = useCallback((newIndex: number, options: UpdateSelectedIndexOptions) => {
		if (newIndex < 0) {
			newIndex = 0;
		} else if (newIndex >= props.listItems.length) {
			newIndex = props.listItems.length - 1;
		}

		const newItem = props.listItems[newIndex];
		let newOverrideIndex = -1;
		if (newItem.kind === ListItemType.AllNotes) {
			props.dispatch({
				type: 'SMART_FILTER_SELECT',
				id: ALL_NOTES_FILTER_ID,
			});
		} else if (newItem.kind === ListItemType.Folder) {
			props.dispatch({
				type: options.extend ? 'FOLDER_SELECT_ADD' : 'FOLDER_SELECT',
				id: newItem.folder.id,
			});
		} else if (newItem.kind === ListItemType.Tag) {
			props.dispatch({
				type: options.extend ? 'TAG_SELECT_ADD' : 'TAG_SELECT',
				id: newItem.tag.id,
			});
		} else {
			newOverrideIndex = newIndex;
		}
		setSelectedIndexOverride(newOverrideIndex);
		setPrimarySelectedIndex(newIndex);
	}, [props.listItems, props.dispatch]);

	const selectedIndexes = useMemo(() => {
		return selectedIndexOverride === -1 ? appStateSelectedIndexes : [selectedIndexOverride];
	}, [appStateSelectedIndexes, selectedIndexOverride]);
	const selectedIndex = selectedIndexes.includes(primarySelectedIndex) ? primarySelectedIndex : (selectedIndexes[0] ?? -1);

	return {
		selectedIndex,
		selectedIndexes,
		updateSelectedIndex,
	};
};

export default useSelectedSidebarIndex;
