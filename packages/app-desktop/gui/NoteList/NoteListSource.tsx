import * as React from 'react';
import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from '../../app.reducer';
import { _ } from '@joplin/lib/locale';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import NoteListItem from '../NoteListItem';
import CommandService from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import styled from 'styled-components';
import ItemList from '../ItemList';
const { connect } = require('react-redux');
import Note from '@joplin/lib/models/Note';
import { Props } from './utils/types';
import usePrevious from '../hooks/usePrevious';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';

const commands = [
	require('./commands/focusElementNoteList'),
];

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

	const itemHeight = 34;

	const focusItemIID_ = useRef<any>(null);
	const noteListRef = useRef(null);
	const itemListRef = useRef(null);

	let globalDragEndEventRegistered_ = false;

	const style = useMemo(() => {
		return {};
	}, []);

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
		// While setting
		//   event.dataTransfer.effectAllowed = 'move';
		// causes the drag cursor to have a "move", rather than an "add", icon,
		// this breaks note drag and drop into the markdown editor.
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
			onCheckboxClick={() => {}}
			onDragStart={noteItem_dragStart}
			onNoteDragOver={noteItem_noteDragOver}
			onTitleClick={() => {}}
			onContextMenu={() => {}}
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
				onNoteDrop={noteItem_noteDrop}
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
