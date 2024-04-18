import * as React from 'react';
import { AppState } from '../../app.reducer';
import ItemList from '../ItemList';
import { connect } from 'react-redux';
import useSidebarListData from './hooks/useSidebarListData';
import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import useOnRenderItem from './hooks/useOnRenderItem';
import { Dispatch } from 'redux';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useMemo, useRef, useState } from 'react';
import useElementHeight from '../hooks/useElementHeight';
import useSelectedSidebarIndex from './hooks/useSelectedSidebarIndex';
import useOnSidebarKeyDownHandler from './hooks/useOnSidebarKeyDownHandler';
import { ListItem } from './types';
import useFocusHandler from './hooks/useFocusHandler';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	tags: TagsWithNoteCountEntity[];
	folders: FolderEntity[];
	notesParentType: string;
	selectedTagId: string;
	selectedFolderId: string;
	selectedSmartFilterId: string;
	collapsedFolderIds: string[];
	folderHeaderIsExpanded: boolean;
	tagHeaderIsExpanded: boolean;
	plugins: PluginStates;
}


const NotebookAndTagList: React.FC<Props> = props => {
	const listItems = useSidebarListData(props);
	const { selectedIndex, updateSelectedIndex } = useSelectedSidebarIndex({
		...props,
		listItems: listItems,
	});

	const [selectedListElement, setSelectedListElement] = useState<HTMLElement|null>(null);
	const onRenderItem = useOnRenderItem({
		...props,
		selectedIndex,
		onSelectedElementShown: setSelectedListElement,
	});

	const onKeyEventHandler = useOnSidebarKeyDownHandler({
		dispatch: props.dispatch,
		listItems: listItems,
		selectedIndex,
		updateSelectedIndex,
	});

	const itemListRef = useRef<ItemList<ListItem>>();
	useFocusHandler({ itemListRef, selectedListElement, selectedIndex, listItems });

	const [itemListContainer, setItemListContainer] = useState<HTMLDivElement|null>(null);
	const listHeight = useElementHeight(itemListContainer);
	const listStyle = useMemo(() => ({ height: listHeight }), [listHeight]);

	return (
		<div
			className='notebook-and-tag-list'
			ref={setItemListContainer}
		>
			<ItemList
				className='items'
				ref={itemListRef}
				style={listStyle}
				itemHeight={30}
				items={listItems}
				itemRenderer={onRenderItem}
				onKeyDown={onKeyEventHandler}
			/>
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		tags: state.tags,
		folders: state.folders,
		notesParentType: state.notesParentType,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		collapsedFolderIds: state.collapsedFolderIds,
		selectedSmartFilterId: state.selectedSmartFilterId,
		plugins: state.pluginService.plugins,
		tagHeaderIsExpanded: state.settings.tagHeaderIsExpanded,
		folderHeaderIsExpanded: state.settings.folderHeaderIsExpanded,
	};
};

export default connect(mapStateToProps)(NotebookAndTagList);
