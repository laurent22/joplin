import * as React from 'react';
import { useMemo, useState, useRef, useCallback } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import NoteListItem from '../NoteListItem';
import styled from 'styled-components';
import ItemList from '../ItemList';
const { connect } = require('react-redux');
import { Props } from './utils/types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';

const StyledRoot = styled.div``;

const NoteListComponent = (props: Props) => {
	const [width] = useState(0);

	const itemHeight = 34;

	const noteListRef = useRef(null);
	const itemListRef = useRef(null);

	const style = useMemo(() => {
		return {};
	}, []);

	const renderItem = useCallback((item: any, index: number) => {
		return <NoteListItem
			key={item.id}
			style={style}
			item={item}
			index={index}
			themeId={props.themeId}
			width={width}
			height={itemHeight}
			dragItemIndex={0}
			highlightedWords={[]}
			isProvisional={props.provisionalNoteIds.includes(item.id)}
			isSelected={props.selectedNoteIds.indexOf(item.id) >= 0}
			isWatched={props.watchedNoteFiles.indexOf(item.id) < 0}
			itemCount={props.notes.length}
			onCheckboxClick={() => {}}
			onDragStart={()=>{}}
			onNoteDragOver={()=>{}}
			onTitleClick={() => {}}
			onContextMenu={() => {}}
			draggable={!props.parentFolderIsReadOnly}
		/>;
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [style, props.themeId, width, itemHeight, props.provisionalNoteIds, props.selectedNoteIds, props.watchedNoteFiles,
		props.notes,
		props.notesParentType,
		props.searches,
		props.selectedSearchId,
		props.highlightedWords,
		props.parentFolderIsReadOnly,
	]);
	const renderItemList = () => {
		if (!props.notes.length) return null;

		return (
			<ItemList
				ref={itemListRef}
				disabled={props.isInsertingNotes}
				itemHeight={32}
				className={'note-list'}
				items={props.notes}
				style={props.size}
				itemRenderer={renderItem}
				onKeyDown={() => {}}
				onNoteDrop={()=>{}}
			/>
		);
	};

	if (!props.size) throw new Error('props.size is required');

	return (
		<StyledRoot ref={noteListRef}>
			{renderItemList()}
		</StyledRoot>
	);
};

const mapStateToProps = (state: AppState) => {
	const selectedFolder: FolderEntity = state.notesParentType === 'Folder' ? BaseModel.byId(state.folders, state.selectedFolderId) : null;
	const userId = state.settings['sync.userId'];

	return {
		notes: state.notes,
		folders: state.folders,
		selectedNoteIds: state.selectedNoteIds,
		selectedFolderId: state.selectedFolderId,
		themeId: state.settings.theme,
		notesParentType: state.notesParentType,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
		watchedNoteFiles: state.watchedNoteFiles,
		provisionalNoteIds: state.provisionalNoteIds,
		isInsertingNotes: state.isInsertingNotes,
		noteSortOrder: state.settings['notes.sortOrder.field'],
		uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
		showCompletedTodos: state.settings.showCompletedTodos,
		highlightedWords: state.highlightedWords,
		plugins: state.pluginService.plugins,
		customCss: state.customCss,
		focusedField: state.focusedField,
		parentFolderIsReadOnly: state.notesParentType === 'Folder' && selectedFolder ? itemIsReadOnlySync(ModelType.Folder, ItemChange.SOURCE_UNSPECIFIED, selectedFolder as ItemSlice, userId, state.shareService) : false,
	};
};

export default connect(mapStateToProps)(NoteListComponent);
