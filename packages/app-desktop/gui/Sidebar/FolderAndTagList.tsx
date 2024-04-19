import * as React from 'react';
import { AppState } from '../../app.reducer';
import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { useMemo, useRef, useState } from 'react';
import ItemList from '../ItemList';
import useElementHeight from '../hooks/useElementHeight';
import useSidebarListData from './hooks/useSidebarListData';
import useSelectedSidebarIndex from './hooks/useSelectedSidebarIndex';
import useOnSidebarKeyDownHandler from './hooks/useOnSidebarKeyDownHandler';
import useFocusHandler from './hooks/useFocusHandler';
import useOnRenderItem from './hooks/useOnRenderItem';
import { ListItem } from './types';
import useSidebarCommandHandler from './hooks/useSidebarCommandHandler';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	plugins: PluginStates;

	tags: TagsWithNoteCountEntity[];
	folders: FolderEntity[];
	notesParentType: string;
	selectedTagId: string;
	selectedFolderId: string;
	selectedSmartFilterId: string;
	collapsedFolderIds: string[];
	folderHeaderIsExpanded: boolean;
	tagHeaderIsExpanded: boolean;
}


const FolderAndTagList: React.FC<Props> = props => {
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
	const { focusSidebar } = useFocusHandler({ itemListRef, selectedListElement, selectedIndex, listItems });

	useSidebarCommandHandler({ focusSidebar });

	const [itemListContainer, setItemListContainer] = useState<HTMLDivElement|null>(null);
	const listHeight = useElementHeight(itemListContainer);
	const listStyle = useMemo(() => ({ height: listHeight }), [listHeight]);

	return (
		<div
			className='folder-and-tag-list'
			ref={setItemListContainer}
		>
			<ItemList
				className='items'
				ref={itemListRef}
				style={listStyle}
				items={listItems}
				itemRenderer={onRenderItem}
				onKeyDown={onKeyEventHandler}

				itemHeight={30}
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

export default connect(mapStateToProps)(FolderAndTagList);
