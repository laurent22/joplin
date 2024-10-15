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
import { stateUtils } from '@joplin/lib/reducer';
import useOnRenderListWrapper from './hooks/useOnRenderListWrapper';

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

	const listContainerRef = useRef<HTMLDivElement|null>(null);
	const onRenderItem = useOnRenderItem({
		...props,
		selectedIndex,
		listItems,
		containerRef: listContainerRef,
	});

	const onKeyEventHandler = useOnSidebarKeyDownHandler({
		dispatch: props.dispatch,
		listItems: listItems,
		selectedIndex,
		updateSelectedIndex,
		collapsedFolderIds: props.collapsedFolderIds,
	});

	const itemListRef = useRef<ItemList<ListItem>>();
	const { focusSidebar } = useFocusHandler({ itemListRef, selectedIndex, listItems });

	useSidebarCommandHandler({ focusSidebar });

	const [itemListContainer, setItemListContainer] = useState<HTMLDivElement|null>(null);
	listContainerRef.current = itemListContainer;
	const listHeight = useElementHeight(itemListContainer);
	const listStyle = useMemo(() => ({ height: listHeight }), [listHeight]);

	const onRenderContentWrapper = useOnRenderListWrapper({ selectedIndex, onKeyDown: onKeyEventHandler });

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
				renderContentWrapper={onRenderContentWrapper}

				// The selected item is the only item with tabindex=0. Always render it
				// to allow the item list to be focused.
				alwaysRenderSelection={true}
				selectedIndex={selectedIndex}

				itemHeight={30}
			/>
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	const mainWindowState = stateUtils.mainWindowState(state);

	return {
		themeId: state.settings.theme,
		tags: state.tags,
		folders: state.folders,
		notesParentType: mainWindowState.notesParentType,
		selectedFolderId: mainWindowState.selectedFolderId,
		selectedTagId: mainWindowState.selectedTagId,
		collapsedFolderIds: state.collapsedFolderIds,
		selectedSmartFilterId: mainWindowState.selectedSmartFilterId,
		plugins: state.pluginService.plugins,
		tagHeaderIsExpanded: state.settings.tagHeaderIsExpanded,
		folderHeaderIsExpanded: state.settings.folderHeaderIsExpanded,
	};
};

export default connect(mapStateToProps)(FolderAndTagList);
