import * as React from 'react';
import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from '../../app.reducer';
import eventManager from '@joplin/lib/eventManager';
import NoteListUtils from '../utils/NoteListUtils';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import NoteListItem from '../NoteListItem';
import CommandService from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import styled from 'styled-components';
import { themeStyle } from '@joplin/lib/theme';
import ItemList from '../ItemList';
const { connect } = require('react-redux');
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { Props } from './types';
import usePrevious from '../hooks/usePrevious';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';

const commands = [
	require('./commands/focusElementNoteList'),
];

const StyledRoot = styled.div`
	width: 100%;
	height: 100%;
	background-color: ${(props: any) => props.theme.backgroundColor3};
	border-right: 1px solid ${(props: any) => props.theme.dividerColor};
`;

const itemAnchorRefs_: any = {
	current: {},
};

export const itemAnchorRef = (itemId: string) => {
	if (itemAnchorRefs_.current[itemId] && itemAnchorRefs_.current[itemId].current) return itemAnchorRefs_.current[itemId].current;
	return null;
};

const NoteListComponent = (props: Props) => {
	const [dragOverTargetNoteIndex, setDragOverTargetNoteIndex] = useState(null);
	const [width, setWidth] = useState(0);
	const [, setHeight] = useState(0);

	useEffect(() => {
		itemAnchorRefs_.current = {};
		CommandService.instance().registerCommands(commands);

		return () => {
			itemAnchorRefs_.current = {};
			CommandService.instance().unregisterCommands(commands);
		};
	}, []);

	const [itemHeight, setItemHeight] = useState(34);

	const focusItemIID_ = useRef<any>(null);
	const noteListRef = useRef(null);
	const itemListRef = useRef(null);

	let globalDragEndEventRegistered_ = false;

	const style = useMemo(() => {
		const theme = themeStyle(props.themeId);

		return {
			root: {
				backgroundColor: theme.backgroundColor,
			},
			listItem: {
				maxWidth: '100%',
				height: itemHeight,
				boxSizing: 'border-box',
				display: 'flex',
				alignItems: 'stretch',
				backgroundColor: theme.backgroundColor,
				borderBottom: `1px solid ${theme.dividerColor}`,
			},
			listItemSelected: {
				backgroundColor: theme.selectedColor,
			},
			listItemTitle: {
				fontFamily: theme.fontFamily,
				fontSize: theme.fontSize,
				textDecoration: 'none',
				color: theme.color,
				cursor: 'default',
				whiteSpace: 'nowrap',
				flex: 1,
				display: 'flex',
				alignItems: 'center',
				overflow: 'hidden',
			},
			listItemTitleCompleted: {
				opacity: 0.5,
				textDecoration: 'line-through',
			},
		};
	}, [props.themeId, itemHeight]);

	const itemContextMenu = useCallback((event: any) => {
		const currentItemId = event.currentTarget.getAttribute('data-id');
		if (!currentItemId) return;

		let noteIds = [];
		if (props.selectedNoteIds.indexOf(currentItemId) < 0) {
			noteIds = [currentItemId];
		} else {
			noteIds = props.selectedNoteIds;
		}

		if (!noteIds.length) return;

		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: props.notes,
			dispatch: props.dispatch,
			watchedNoteFiles: props.watchedNoteFiles,
			plugins: props.plugins,
			inConflictFolder: props.selectedFolderId === Folder.conflictFolderId(),
			customCss: props.customCss,
		});

		menu.popup({ window: bridge().window() });
	}, [props.selectedNoteIds, props.notes, props.dispatch, props.watchedNoteFiles, props.plugins, props.selectedFolderId, props.customCss]);

	const onGlobalDrop_ = () => {
		unregisterGlobalDragEndEvent_();
		setDragOverTargetNoteIndex(null);
	};

	const registerGlobalDragEndEvent_ = () => {
		if (globalDragEndEventRegistered_) return;
		globalDragEndEventRegistered_ = true;
		document.addEventListener('dragend', onGlobalDrop_);
	};

	const unregisterGlobalDragEndEvent_ = () => {
		globalDragEndEventRegistered_ = false;
		document.removeEventListener('dragend', onGlobalDrop_);
	};

	const dragTargetNoteIndex_ = (event: any) => {
		return Math.abs(Math.round((event.clientY - itemListRef.current.offsetTop() + itemListRef.current.offsetScroll()) / itemHeight));
	};

	const noteItem_noteDragOver = (event: any) => {
		if (props.notesParentType !== 'Folder') return;

		const dt = event.dataTransfer;

		if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
			event.preventDefault();
			const newIndex = dragTargetNoteIndex_(event);
			if (dragOverTargetNoteIndex === newIndex) return;
			registerGlobalDragEndEvent_();
			setDragOverTargetNoteIndex(newIndex);
		}
	};

	const canManuallySortNotes = async () => {
		if (props.notesParentType !== 'Folder') return false;

		if (props.noteSortOrder !== 'order') {
			const doIt = await bridge().showConfirmMessageBox(_('To manually sort the notes, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notes by')), {
				buttons: [_('Do it now'), _('Cancel')],
			});
			if (!doIt) return false;

			Setting.setValue('notes.sortOrder.field', 'order');
			return false;
		}
		return true;
	};

	const noteItem_noteDrop = async (event: any) => {

		// TODO: check that parent type is folder
		if (!canManuallySortNotes()) {
			return;
		}
		const dt = event.dataTransfer;
		unregisterGlobalDragEndEvent_();
		setDragOverTargetNoteIndex(null);

		const targetNoteIndex = dragTargetNoteIndex_(event);
		const noteIds: string[] = JSON.parse(dt.getData('text/x-jop-note-ids'));

		void Note.insertNotesAt(props.selectedFolderId, noteIds, targetNoteIndex, props.uncompletedTodosOnTop, props.showCompletedTodos);
	};


	const noteItem_checkboxClick = async (event: any, item: any) => {
		const checked = event.target.checked;
		const newNote = {
			id: item.id,
			todo_completed: checked ? time.unixMs() : 0,
		};
		await Note.save(newNote, { userSideValidation: true });
		eventManager.emit('todoToggle', { noteId: item.id, note: newNote });
	};

	const noteItem_titleClick = async (event: any, item: any) => {
		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			props.dispatch({
				type: 'NOTE_SELECT_TOGGLE',
				id: item.id,
			});
		} else if (event.shiftKey) {
			event.preventDefault();
			props.dispatch({
				type: 'NOTE_SELECT_EXTEND',
				id: item.id,
			});
		} else {
			props.dispatch({
				type: 'NOTE_SELECT',
				id: item.id,
			});
		}
	};

	const noteItem_dragStart = useCallback((event: any) => {
		if (props.parentFolderIsReadOnly) return false;

		let noteIds = [];

		// Here there is two cases:
		// - If multiple notes are selected, we drag the group
		// - If only one note is selected, we drag the note that was clicked on (which might be different from the currently selected note)
		if (props.selectedNoteIds.length >= 2) {
			noteIds = props.selectedNoteIds;
		} else {
			const clickedNoteId = event.currentTarget.getAttribute('data-id');
			if (clickedNoteId) noteIds.push(clickedNoteId);
		}

		if (!noteIds.length) return false;

		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-note-ids', JSON.stringify(noteIds));
		return true;
	}, [props.parentFolderIsReadOnly, props.selectedNoteIds]);

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
			dragItemIndex={dragOverTargetNoteIndex}
			highlightedWords={highlightedWords()}
			isProvisional={props.provisionalNoteIds.includes(item.id)}
			isSelected={props.selectedNoteIds.indexOf(item.id) >= 0}
			isWatched={props.watchedNoteFiles.indexOf(item.id) < 0}
			itemCount={props.notes.length}
			onCheckboxClick={noteItem_checkboxClick}
			onDragStart={noteItem_dragStart}
			onNoteDragOver={noteItem_noteDragOver}
			onTitleClick={noteItem_titleClick}
			onContextMenu={itemContextMenu}
			draggable={!props.parentFolderIsReadOnly}
		/>;
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [style, props.themeId, width, itemHeight, dragOverTargetNoteIndex, props.provisionalNoteIds, props.selectedNoteIds, props.watchedNoteFiles,
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

	const scrollNoteIndex_ = (keyCode: any, ctrlKey: any, metaKey: any, noteIndex: any) => {

		if (keyCode === 33) {
			// Page Up
			noteIndex -= (itemListRef.current.visibleItemCount() - 1);

		} else if (keyCode === 34) {
			// Page Down
			noteIndex += (itemListRef.current.visibleItemCount() - 1);

		} else if ((keyCode === 35 && ctrlKey) || (keyCode === 40 && metaKey)) {
			// CTRL+End, CMD+Down
			noteIndex = props.notes.length - 1;

		} else if ((keyCode === 36 && ctrlKey) || (keyCode === 38 && metaKey)) {
			// CTRL+Home, CMD+Up
			noteIndex = 0;

		} else if (keyCode === 38 && !metaKey) {
			// Up
			noteIndex -= 1;

		} else if (keyCode === 40 && !metaKey) {
			// Down
			noteIndex += 1;
		}
		if (noteIndex < 0) noteIndex = 0;
		if (noteIndex > props.notes.length - 1) noteIndex = props.notes.length - 1;
		return noteIndex;
	};

	const noteItem_noteMove = async (direction: number) => {
		if (!canManuallySortNotes()) {
			return;
		}
		const noteIds = props.selectedNoteIds;
		const noteId = noteIds[0];
		let targetNoteIndex = BaseModel.modelIndexById(props.notes, noteId);
		if ((direction === 1)) {
			targetNoteIndex += 2;
		}
		if ((direction === -1)) {
			targetNoteIndex -= 1;
		}
		void Note.insertNotesAt(props.selectedFolderId, noteIds, targetNoteIndex, props.uncompletedTodosOnTop, props.showCompletedTodos);
	};

	const onKeyDown = async (event: any) => {
		const keyCode = event.keyCode;
		const noteIds = props.selectedNoteIds;

		if ((keyCode === 40 || keyCode === 38) && event.altKey) {
			// (DOWN / UP) & ALT
			await noteItem_noteMove(keyCode === 40 ? 1 : -1);
			event.preventDefault();
		} else if (noteIds.length > 0 && (keyCode === 40 || keyCode === 38 || keyCode === 33 || keyCode === 34 || keyCode === 35 || keyCode === 36)) {
			// DOWN / UP / PAGEDOWN / PAGEUP / END / HOME
			const noteId = noteIds[0];
			let noteIndex = BaseModel.modelIndexById(props.notes, noteId);

			noteIndex = scrollNoteIndex_(keyCode, event.ctrlKey, event.metaKey, noteIndex);

			const newSelectedNote = props.notes[noteIndex];

			props.dispatch({
				type: 'NOTE_SELECT',
				id: newSelectedNote.id,
			});

			itemListRef.current.makeItemIndexVisible(noteIndex);

			focusNoteId_(newSelectedNote.id);

			event.preventDefault();
		}

		if (noteIds.length && (keyCode === 46 || (keyCode === 8 && event.metaKey))) {
			// DELETE / CMD+Backspace
			event.preventDefault();
			void CommandService.instance().execute('deleteNote', noteIds);
			// await NoteListUtils.confirmDeleteNotes(noteIds);
		}

		if (noteIds.length && keyCode === 32) {
			// SPACE
			event.preventDefault();

			const notes = BaseModel.modelsByIds(props.notes, noteIds);
			const todos = notes.filter((n: any) => !!n.is_todo);
			if (!todos.length) return;

			for (let i = 0; i < todos.length; i++) {
				const toggledTodo = Note.toggleTodoCompleted(todos[i]);
				await Note.save(toggledTodo);
			}

			focusNoteId_(todos[0].id);
		}

		if (keyCode === 9) {
			// TAB
			event.preventDefault();

			if (event.shiftKey) {
				void CommandService.instance().execute('focusElement', 'sideBar');
			} else {
				void CommandService.instance().execute('focusElement', 'noteTitle');
			}
		}

		if (event.keyCode === 65 && (event.ctrlKey || event.metaKey)) {
			// Ctrl+A key
			event.preventDefault();

			props.dispatch({
				type: 'NOTE_SELECT_ALL',
			});
		}
	};

	const focusNoteId_ = (noteId: string) => {
		// - We need to focus the item manually otherwise focus might be lost when the
		//   list is scrolled and items within it are being rebuilt.
		// - We need to use an interval because when leaving the arrow pressed, the rendering
		//   of items might lag behind and so the ref is not yet available at this point.
		if (!itemAnchorRef(noteId)) {
			if (focusItemIID_.current) shim.clearInterval(focusItemIID_.current);
			focusItemIID_.current = shim.setInterval(() => {
				if (itemAnchorRef(noteId)) {
					itemAnchorRef(noteId).focus();
					shim.clearInterval(focusItemIID_.current);
					focusItemIID_.current = null;
				}
			}, 10);
		} else {
			itemAnchorRef(noteId).focus();
		}
	};

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

		return () => {
			if (focusItemIID_.current) {
				shim.clearInterval(focusItemIID_.current);
				focusItemIID_.current = null;
			}
			CommandService.instance().componentUnregisterCommands(commands);
		};
	}, []);

	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	useEffect(() => {
		// When a note list item is styled by userchrome.css, its height is reflected.
		// Ref. https://github.com/laurent22/joplin/pull/6542
		if (dragOverTargetNoteIndex !== null) {
			// When dragged, its height should not be considered.
			// Ref. https://github.com/laurent22/joplin/issues/6639
			return;
		}
		const noteItem = Object.values<any>(itemAnchorRefs_.current)[0]?.current;
		const actualItemHeight = noteItem?.getHeight() ?? 0;
		if (actualItemHeight >= 8) { // To avoid generating too many narrow items
			setItemHeight(actualItemHeight);
		}
	});

	const renderEmptyList = () => {
		if (props.notes.length) return null;

		const theme = themeStyle(props.themeId);
		const padding = 10;
		const emptyDivStyle = {
			padding: `${padding}px`,
			fontSize: theme.fontSize,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontFamily: theme.fontFamily,
		};
		return <div style={emptyDivStyle}>{props.folders.length ? _('No notes in here. Create one by clicking on "New note".') : _('There is currently no notebook. Create one by clicking on "New notebook".')}</div>;
	};

	const renderItemList = () => {
		if (!props.notes.length) return null;

		return (
			<ItemList
				ref={itemListRef}
				disabled={props.isInsertingNotes}
				itemHeight={style.listItem.height}
				className={'note-list'}
				items={props.notes}
				style={props.size}
				itemRenderer={renderItem}
				onKeyDown={onKeyDown}
				onNoteDrop={noteItem_noteDrop}
			/>
		);
	};

	if (!props.size) throw new Error('props.size is required');

	return (
		<StyledRoot ref={noteListRef}>
			{renderEmptyList()}
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
