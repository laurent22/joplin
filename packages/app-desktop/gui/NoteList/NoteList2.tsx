import * as React from 'react';
import { useMemo, useRef, useEffect } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import { Props } from './utils/types';
import { ItemFlow } from '@joplin/lib/services/plugins/api/noteListType';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
import NoteListItem from '../NoteListItem/NoteListItem';
import useItemCss from './utils/useItemCss';
import useOnContextMenu from '../NoteListItem/utils/useOnContextMenu';
import useVisibleRange from './utils/useVisibleRange';
import useScroll from './utils/useScroll';
import useFocusNote from './utils/useFocusNote';
import useOnNoteClick from './utils/useOnNoteClick';
import useMoveNote from './utils/useMoveNote';
import useOnKeyDown from './utils/useOnKeyDown';
import * as focusElementNoteList from './commands/focusElementNoteList';
import CommandService from '@joplin/lib/services/CommandService';
import useDragAndDrop from './utils/useDragAndDrop';
import { itemIsInTrash } from '@joplin/lib/services/trash';
import getEmptyFolderMessage from '@joplin/lib/components/shared/NoteList/getEmptyFolderMessage';
import Folder from '@joplin/lib/models/Folder';
const { connect } = require('react-redux');

const commands = {
	focusElementNoteList,
};

const NoteList = (props: Props) => {
	const listRef = useRef(null);
	const itemRefs = useRef<Record<string, HTMLDivElement>>({});
	const listRenderer = props.listRenderer;

	const itemSize: Size = useMemo(() => {
		return {
			width: listRenderer.itemSize.width ? listRenderer.itemSize.width : props.size.width,
			height: listRenderer.itemSize.height,
		};
	}, [listRenderer.itemSize, props.size.width]);

	const itemsPerLine = useMemo(() => {
		if (listRenderer.flow === ItemFlow.TopToBottom) {
			return 1;
		} else {
			return Math.max(1, Math.floor(props.size.width / itemSize.width));
		}
	}, [listRenderer.flow, props.size.width, itemSize.width]);

	const { scrollTop, onScroll, makeItemIndexVisible } = useScroll(
		itemsPerLine,
		props.notes.length,
		itemSize,
		props.size,
		listRef,
	);

	const [startNoteIndex, endNoteIndex, startLineIndex, endLineIndex, totalLineCount, visibleItemCount] = useVisibleRange(
		itemsPerLine,
		scrollTop,
		props.size,
		itemSize,
		props.notes.length,
	);

	const focusNote = useFocusNote(itemRefs);

	const moveNote = useMoveNote(
		props.notesParentType,
		props.noteSortOrder,
		props.selectedNoteIds,
		props.selectedFolderId,
		props.uncompletedTodosOnTop,
		props.showCompletedTodos,
		props.notes,
		props.selectedFolderInTrash,
		makeItemIndexVisible,
		focusNote,
		props.dispatch,
	);

	const noteItemStyle = useMemo(() => {
		return {
			width: 'auto',
			height: itemSize.height,
		};
	}, [itemSize.height]);

	const noteListStyle = useMemo(() => {
		return {
			width: props.size.width,
			height: props.size.height,
		};
	}, [props.size]);

	const onNoteClick = useOnNoteClick(props.dispatch, focusNote);

	const onKeyDown = useOnKeyDown(
		props.selectedNoteIds,
		moveNote,
		makeItemIndexVisible,
		focusNote,
		props.notes,
		props.dispatch,
		visibleItemCount,
		props.notes.length,
		listRenderer.flow,
		itemsPerLine,
	);

	useItemCss(listRenderer.itemCss);

	useEffect(() => {
		CommandService.instance().registerRuntime(commands.focusElementNoteList.declaration.name, commands.focusElementNoteList.runtime(focusNote));
		return () => {
			CommandService.instance().unregisterRuntime(commands.focusElementNoteList.declaration.name);
		};
	}, [focusNote]);

	const onItemContextMenu = useOnContextMenu(
		props.selectedNoteIds,
		props.selectedFolderId,
		props.notes,
		props.dispatch,
		props.watchedNoteFiles,
		props.plugins,
		props.customCss,
	);

	const { onDragStart, onDragOver, onDrop, dragOverTargetNoteIndex } = useDragAndDrop(props.parentFolderIsReadOnly,
		props.selectedNoteIds,
		props.selectedFolderId,
		listRef,
		scrollTop,
		itemSize,
		props.notesParentType,
		props.noteSortOrder,
		props.uncompletedTodosOnTop,
		props.showCompletedTodos,
		listRenderer.flow,
		itemsPerLine,
		props.selectedFolderInTrash,
	);

	// 2024-04-01: Whatever the below effect is supposed to be doing has been lost in time and even
	// if it's doing something useful it should be refactored. In my tests, removing it doesn't
	// affect anything - including scrolling with the keyboard and switching notes so there's a
	// chance that whatever it's doing is being done more cleanly somewhere else. If a focus
	// related-bug is found, it should be fixed from scratch, without touching this event, although
	// it could possibly be used as a reference.
	//
	// * * *

	// const previousSelectedNoteIds = usePrevious(props.selectedNoteIds, []);
	// const previousNoteCount = usePrevious(props.notes.length, 0);
	// const previousVisible = usePrevious(props.visible, false);

	// useEffect(() => {
	// 	if (previousSelectedNoteIds !== props.selectedNoteIds && props.selectedNoteIds.length === 1) {
	// 		const id = props.selectedNoteIds[0];
	// 		const doRefocus = props.notes.length < previousNoteCount && !props.focusedField;

	// 		for (let i = 0; i < props.notes.length; i++) {
	// 			if (props.notes[i].id === id) {
	// 				makeItemIndexVisible(i);
	// 				if (doRefocus) {
	// 					const ref = itemRefs.current[id];
	// 					if (ref) {
	// 						focus('NoteList::doRefocus', ref);
	// 					}
	// 				}
	// 				break;
	// 			}
	// 		}
	// 	}
	// }, [makeItemIndexVisible, previousSelectedNoteIds, previousNoteCount, previousVisible, props.selectedNoteIds, props.notes, props.focusedField, props.visible]);

	const highlightedWords = useMemo(() => {
		if (props.notesParentType === 'Search') {
			const query = BaseModel.byId(props.searches, props.selectedSearchId);
			if (query) return props.highlightedWords;
		}
		return [];
	}, [props.notesParentType, props.searches, props.selectedSearchId, props.highlightedWords]);

	const renderEmptyList = () => {
		if (props.notes.length) return null;
		return <div className="emptylist">{getEmptyFolderMessage(props.folders, props.selectedFolderId)}</div>;
	};

	const renderFiller = (key: string, style: React.CSSProperties) => {
		if (!props.notes.length) return null;
		if (style.height as number <= 0) return null;
		return <div key={key} style={style}></div>;
	};

	const renderNotes = () => {
		if (!props.notes.length) return null;

		const output: JSX.Element[] = [];

		for (let i = startNoteIndex; i <= endNoteIndex; i++) {
			const note = props.notes[i];

			output.push(
				<NoteListItem
					key={note.id}
					ref={el => itemRefs.current[note.id] = el}
					index={i}
					dragIndex={dragOverTargetNoteIndex}
					noteCount={props.notes.length}
					itemSize={itemSize}
					onChange={listRenderer.onChange}
					onClick={onNoteClick}
					onContextMenu={onItemContextMenu}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					style={noteItemStyle}
					highlightedWords={highlightedWords}
					isProvisional={props.provisionalNoteIds.includes(note.id)}
					flow={listRenderer.flow}
					note={note}
					isSelected={props.selectedNoteIds.includes(note.id)}
					isWatched={props.watchedNoteFiles.includes(note.id)}
					listRenderer={listRenderer}
					dispatch={props.dispatch}
					columns={props.columns}
				/>,
			);
		}

		return output;
	};

	const topFillerHeight = startLineIndex * itemSize.height;
	const bottomFillerHeight = (totalLineCount - endLineIndex - 1) * itemSize.height;

	const fillerBaseStyle = useMemo(() => {
		// return { width: 'auto', border: '1px solid red', backgroundColor: 'green' };
		return { width: 'auto' };
	}, []);

	const topFillerStyle = useMemo(() => {
		return { ...fillerBaseStyle, height: topFillerHeight };
	}, [fillerBaseStyle, topFillerHeight]);

	const bottomFillerStyle = useMemo(() => {
		return { ...fillerBaseStyle, height: bottomFillerHeight };
	}, [fillerBaseStyle, bottomFillerHeight]);

	const notesStyle = useMemo(() => {
		const output: React.CSSProperties = {};

		if (listRenderer.flow === ItemFlow.LeftToRight) {
			output.flexFlow = 'row wrap';
		} else {
			output.flexDirection = 'column';
		}

		return output;
	}, [listRenderer.flow]);

	return (
		<div
			className="note-list"
			style={noteListStyle}
			ref={listRef}
			onScroll={onScroll}
			onKeyDown={onKeyDown}
			onDrop={onDrop}
		>
			{renderEmptyList()}
			{renderFiller('top', topFillerStyle)}
			<div className="notes" style={notesStyle}>
				{renderNotes()}
			</div>
			{renderFiller('bottom', bottomFillerStyle)}
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	const selectedFolder: FolderEntity = state.notesParentType === 'Folder' ? Folder.byId(state.folders, state.selectedFolderId) : null;
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
		selectedFolderInTrash: itemIsInTrash(selectedFolder),
	};
};

export default connect(mapStateToProps)(NoteList);
