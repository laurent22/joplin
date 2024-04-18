import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListItem, ListItemType } from '../types';
import { isFolderSelected, isTagSelected } from '@joplin/lib/components/shared/side-menu-shared';
import { Dispatch } from 'redux';
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids');


interface Props {
	dispatch: Dispatch;
	sidebarData: ListItem[];

	notesParentType: string;
	selectedTagId: string;
	selectedFolderId: string;
	selectedSmartFilterId: string;
}

const useSelectedSidebarIndex = (props: Props) => {
	const appStateSelectedIndex = useMemo(() => {
		for (let i = 0; i < props.sidebarData.length; i++) {
			const listItem = props.sidebarData[i];

			let selected = false;
			if (listItem.kind === ListItemType.AllNotes) {
				selected = props.selectedSmartFilterId === ALL_NOTES_FILTER_ID && props.notesParentType === 'SmartFilter';
			} else if (listItem.kind === ListItemType.Header) {
				selected = false;
			} else if (listItem.kind === ListItemType.Notebook) {
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
	}, [props.sidebarData, props.selectedFolderId, props.selectedTagId, props.selectedSmartFilterId, props.notesParentType]);

	const [selectedIndexOverride, setSelectedIndexOverride] = useState(-1);
	useEffect(() => {
		setSelectedIndexOverride(-1);
	}, [appStateSelectedIndex]);

	const updateSelectedIndex = useCallback((newIndex: number) => {
		if (newIndex < 0) {
			newIndex = 0;
		} else if (newIndex >= props.sidebarData.length) {
			newIndex = props.sidebarData.length - 1;
		}

		const newItem = props.sidebarData[newIndex];
		if (newItem.kind === ListItemType.AllNotes) {
			props.dispatch({
				type: 'SMART_FILTER_SELECT',
				id: ALL_NOTES_FILTER_ID,
			});
		} else if (newItem.kind === ListItemType.Notebook) {
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
			setSelectedIndexOverride(newIndex);
		}
	}, [props.sidebarData, props.dispatch]);

	const selectedIndex = selectedIndexOverride === -1 ? appStateSelectedIndex : selectedIndexOverride;
	return { selectedIndex, updateSelectedIndex };
};

export default useSelectedSidebarIndex;
