import * as React from 'react';
import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import NoteListItem from '../NoteListItem';
import styled from 'styled-components';
import ItemList from '../ItemList';
const { connect } = require('react-redux');
import { Props } from './utils/types';
import usePrevious from '../hooks/usePrevious';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';

const StyledRoot = styled.div`

`;

const itemAnchorRefs_: any = {
	current: {},
};

export const itemAnchorRef = (itemId: string) => {
	if (itemAnchorRefs_.current[itemId] && itemAnchorRefs_.current[itemId].current) return itemAnchorRefs_.current[itemId].current;
	return null;
};

const NoteListComponent = (props: Props) => {
	const [width, setWidth] = useState(0);
	const [, setHeight] = useState(0);

	const itemHeight = 34;

	const noteListRef = useRef(null);
	const itemListRef = useRef(null);


	const style = useMemo(() => {
		return {};
	}, []);

	const renderItem = useCallback((item: any, index: number) => {
		const highlightedWords = () => {
			if (props.notesParentType === 'Search') {
				const query = BaseModel.byId(props.searches, props.selectedSearchId);
				if (query) {
					return props.highlightedWords;
				}
			}
			return [];
		};

		if (!itemAnchorRefs_.current[item.id]) itemAnchorRefs_.current[item.id] = React.createRef();
		const ref = itemAnchorRefs_.current[item.id];

		return <NoteListItem
			ref={ref}
			key={item.id}
			style={style}
			item={item}
			index={index}
			themeId={props.themeId}
			width={width}
			height={itemHeight}
			dragItemIndex={0}
			highlightedWords={highlightedWords()}
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

	const previousSelectedNoteIds = usePrevious(props.selectedNoteIds, []);
	const previousNotes = usePrevious(props.notes, []);
	const previousVisible = usePrevious(props.visible, false);

	useEffect(() => {
		if (previousSelectedNoteIds !== props.selectedNoteIds && props.selectedNoteIds.length === 1) {
			const id = props.selectedNoteIds[0];
			const doRefocus = props.notes.length < previousNotes.length && !props.focusedField;

			for (let i = 0; i < props.notes.length; i++) {
				if (props.notes[i].id === id) {
					itemListRef.current.makeItemIndexVisible(i);
					if (doRefocus) {
						const ref = itemAnchorRef(id);
						if (ref) ref.focus();
					}
					break;
				}
			}
		}

		if (previousVisible !== props.visible) {
			updateSizeState();
		}
	}, [previousSelectedNoteIds, previousNotes, previousVisible, props.selectedNoteIds, props.notes, props.focusedField, props.visible]);

	const updateSizeState = () => {
		setWidth(noteListRef.current.clientWidth);
		setHeight(noteListRef.current.clientHeight);
	};

	const resizableLayout_resize = () => {
		updateSizeState();
	};

	useEffect(() => {
		props.resizableLayoutEventEmitter.on('resize', resizableLayout_resize);
		return () => {
			props.resizableLayoutEventEmitter.off('resize', resizableLayout_resize);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.resizableLayoutEventEmitter]);

	useEffect(() => {
		updateSizeState();
	}, []);

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
