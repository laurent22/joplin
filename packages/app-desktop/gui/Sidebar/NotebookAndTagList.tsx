import * as React from 'react';
import { AppState } from '../../app.reducer';
import ItemList from '../ItemList';
import { connect } from 'react-redux';
import useSidebarListData from './hooks/useSidebarListData';
import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import useOnRenderItem from './hooks/useOnRenderItem';
import { Dispatch } from 'redux';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useEffect, useMemo, useState } from 'react';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	tags: TagsWithNoteCountEntity[];
	folders: FolderEntity[];
	notesParentType: string;
	selectedTagId: string;
	selectedFolderId: string;
	collapsedFolderIds: string[];
	plugins: PluginStates;
}

const useListContainerHeight = (container: HTMLElement) => {
	const [height, setHeight] = useState(500);

	useEffect(() => {
		if (!container) return () => {};
		const observer = new ResizeObserver(() => {
			setHeight(container.clientHeight);
		});
		observer.observe(container);

		return () => {
			observer.disconnect();
		};
	}, [container]);

	return height;
};

const NotebookAndTagList: React.FC<Props> = props => {
	const items = useSidebarListData(props);

	const onRenderItem = useOnRenderItem(props);

	const [itemListContainer, setItemListContainer] = useState<HTMLDivElement|null>(null);
	const listHeight = useListContainerHeight(itemListContainer);
	const listStyle = useMemo(() => ({ height: listHeight }), [listHeight]);

	return (
		<div
			className='notebook-and-tag-list'
			ref={setItemListContainer}
		>
			<ItemList
				className='items'
				style={listStyle}
				itemHeight={30}
				items={items}
				itemRenderer={onRenderItem}
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
		plugins: state.pluginService.plugins,
	};
};

export default connect(mapStateToProps)(NotebookAndTagList);
