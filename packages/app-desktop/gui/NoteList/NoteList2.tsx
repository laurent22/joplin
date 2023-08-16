import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useMemo, useRef, useEffect } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import { Props } from './utils/types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
// import defaultListRenderer from './utils/defaultListRenderer';
import NoteListItem from '../NoteListItem/NoteListItem';
import useRenderedNotes from './utils/useRenderedNotes';
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
import usePrevious from '../hooks/usePrevious';
import defaultLeftToRightItemRenderer from './utils/defaultLeftToRightListRenderer';
const { connect } = require('react-redux');

const commands = {
	focusElementNoteList,
};

const NoteList = (props: Props) => {
	const listRef = useRef(null);
	const itemRefs = useRef<Record<string, HTMLDivElement>>({});

	const listRenderer = defaultLeftToRightItemRenderer;

	const itemSize: Size = useMemo(() => {
		return listRenderer.itemSize;
	}, [listRenderer.itemSize]);

	const { scrollTop, onScroll, scrollNoteIndex, makeItemIndexVisible } = useScroll(
		props.notes.length,
		itemSize,
		props.size,
		listRef
	);

	const [itemsPerLine, startNoteIndex, endNoteIndex, startLineIndex, endLineIndex, totalLineCount, visibleItemCount] = useVisibleRange(
		scrollTop,
		props.size,
		itemSize,
		props.notes.length,
		listRenderer.flow
	);

	const focusNote = useFocusNote(itemRefs);

	const moveNote = useMoveNote(
		props.notesParentType,
		props.noteSortOrder,
		props.selectedNoteIds,
		props.selectedFolderId,
		props.uncompletedTodosOnTop,
		props.showCompletedTodos,
		props.notes
	);

	const renderedNotes = useRenderedNotes(
		startNoteIndex,
		endNoteIndex,
		props.notes,
		props.selectedNoteIds,
		itemSize,
		listRenderer,
		props.highlightedWords,
		props.watchedNoteFiles
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
		scrollNoteIndex,
		makeItemIndexVisible,
		focusNote,
		props.notes,
		props.dispatch,
		visibleItemCount
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
		props.customCss
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
		props.showCompletedTodos
	);

	const previousSelectedNoteIds = usePrevious(props.selectedNoteIds, []);
	const previousNoteCount = usePrevious(props.notes.length, 0);
	const previousVisible = usePrevious(props.visible, false);

	useEffect(() => {
		if (previousSelectedNoteIds !== props.selectedNoteIds && props.selectedNoteIds.length === 1) {
			const id = props.selectedNoteIds[0];
			const doRefocus = props.notes.length < previousNoteCount && !props.focusedField;

			for (let i = 0; i < props.notes.length; i++) {
				if (props.notes[i].id === id) {
					makeItemIndexVisible(i);
					if (doRefocus) {
						const ref = itemRefs.current[id];
						if (ref) ref.focus();
					}
					break;
				}
			}
		}
	}, [makeItemIndexVisible, previousSelectedNoteIds, previousNoteCount, previousVisible, props.selectedNoteIds, props.notes, props.focusedField, props.visible]);

	const highlightedWords = useMemo(() => {
		if (props.notesParentType === 'Search') {
			const query = BaseModel.byId(props.searches, props.selectedSearchId);
			if (query) return props.highlightedWords;
		}
		return [];
	}, [props.notesParentType, props.searches, props.selectedSearchId, props.highlightedWords]);

	const renderFiller = (elements: JSX.Element[], keyPrefix: string, width: number, height: number) => {
		for (let i = 0; i < itemsPerLine; i++) {
			elements.push(<div key={keyPrefix + i} style={{ width, height }}></div>);
		}
	};

	const renderEmptyList = () => {
		if (props.notes.length) return null;
		return <div className="emptylist">{props.folders.length ? _('No notes in here. Create one by clicking on "New note".') : _('There is currently no notebook. Create one by clicking on "New notebook".')}</div>;
	};

	const renderNotes = () => {
		if (!props.notes.length) return null;

		const output: JSX.Element[] = [];

		renderFiller(output, 'top', itemSize.width, startLineIndex * itemSize.height);

		for (let i = startNoteIndex; i <= endNoteIndex; i++) {
			const note = props.notes[i];
			const renderedNote = renderedNotes[note.id];

			output.push(
				<NoteListItem
					key={note.id}
					ref={el => itemRefs.current[note.id] = el}
					index={i}
					dragIndex={dragOverTargetNoteIndex}
					noteCount={props.notes.length}
					itemSize={itemSize}
					noteHtml={renderedNote ? renderedNote.html : ''}
					noteId={note.id}
					onChange={listRenderer.onChange}
					onClick={onNoteClick}
					onContextMenu={onItemContextMenu}
					onDragStart={onDragStart}
					onDragOver={onDragOver}
					style={noteItemStyle}
					highlightedWords={highlightedWords}
					isProvisional={props.provisionalNoteIds.includes(note.id)}
					flow={listRenderer.flow}
				/>
			);
		}

		renderFiller(output, 'bottom', itemSize.width, (totalLineCount - endLineIndex - 1) * itemSize.height);

		return output;
	};

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
			{renderNotes()}
		</div>
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

export default connect(mapStateToProps)(NoteList);
