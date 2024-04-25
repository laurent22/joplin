import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListItem, ListItemType } from '../types';
import { isFolderSelected, isTagSelected } from '@joplin/lib/components/shared/side-menu-shared';
import { Dispatch } from 'redux';
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');


interface Props {
	dispatch: Dispatch;
	listItems: ListItem[];

	notesParentType: string;
	selectedTagId: string;
	selectedFolderId: string;
	selectedSmartFilterId: string;
}

const useSelectedSidebarIndex = (props: Props) => {
	const appStateSelectedIndex = useMemo(() => {
		for (let i = 0; i < props.listItems.length; i++) {
			const listItem = props.listItems[i];

			let selected = false;
			if (listItem.kind === ListItemType.AllNotes) {
				selected = props.selectedSmartFilterId === ALL_NOTES_FILTER_ID && props.notesParentType === 'SmartFilter';
			} else if (listItem.kind === ListItemType.Header || listItem.kind === ListItemType.Spacer) {
				selected = false;
			} else if (listItem.kind === ListItemType.Folder) {
				selected = isFolderSelected(listItem.folder, { selectedFolderId: props.selectedFolderId, notesParentType: props.notesParentType });
			} else if (listItem.kind === ListItemType.Tag) {
				selected = isTagSelected(listItem.tag, { selectedTagId: props.selectedTagId, notesParentType: props.notesParentType });
			} else {
				const exhaustivenessCheck: never = listItem;
				return exhaustivenessCheck;
			}

			if (selected) {
				return i;
			}
		}
		return -1;
	}, [props.listItems, props.selectedFolderId, props.selectedTagId, props.selectedSmartFilterId, props.notesParentType]);

	// Not all list items correspond with selectable Joplin folders/tags, but we want to
	// be able to select them anyway. This is handled with selectedIndexOverride.
	//
	// When selectedIndexOverride >= 0, it corresponds to the index of a selected item with no
	// specific note parent item (e.g. a header).
	const [selectedIndexOverride, setSelectedIndexOverride] = useState(-1);
	useEffect(() => {
		setSelectedIndexOverride(-1);
	}, [appStateSelectedIndex]);

	const updateSelectedIndex = useCallback((newIndex: number) => {
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
				type: 'FOLDER_SELECT',
				id: newItem.folder.id,
			});
		} else if (newItem.kind === ListItemType.Tag) {
			props.dispatch({
				type: 'TAG_SELECT',
				id: newItem.tag.id,
			});
		} else {
			newOverrideIndex = newIndex;
		}
		setSelectedIndexOverride(newOverrideIndex);
	}, [props.listItems, props.dispatch]);

	const selectedIndex = selectedIndexOverride === -1 ? appStateSelectedIndex : selectedIndexOverride;
	return { selectedIndex, updateSelectedIndex };
};

export default useSelectedSidebarIndex;
