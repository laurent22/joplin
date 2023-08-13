import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useMemo, useRef, useEffect, useImperativeHandle } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import { ItemFlow, Props } from './utils/types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
import defaultListRenderer from './utils/defaultListRenderer';
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
const { connect } = require('react-redux');

const commands = {
	focusElementNoteList,
};

const NoteList = (props: Props) => {
	const listRef = useRef(null);
	const itemRefs = useRef<Record<string, HTMLDivElement>>({});

	const listRenderer = defaultListRenderer;

	if (listRenderer.flow !== ItemFlow.TopToBottom) throw new Error('Not implemented');

	const itemSize: Size = useMemo(() => {
		return listRenderer.itemSize;
	}, [listRenderer.itemSize]);

	const { scrollTop, onScroll, scrollNoteIndex, makeItemIndexVisible } = useScroll(
		props.notes.length,
		itemSize,
		props.size,
		listRef
	);

	const [startNoteIndex, endNoteIndex, visibleItemCount] = useVisibleRange(
		scrollTop,
		props.size,
		itemSize,
		props.notes.length
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

	const renderedNotes = useRenderedNotes(startNoteIndex, endNoteIndex, props.notes, props.selectedNoteIds, itemSize, listRenderer);

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

	useImperativeHandle(listRef, () => {
		return {
			focusNote: (noteId: string) => {
				focusNote(noteId);
			},
		};
	}, [focusNote]);

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
		CommandService.instance().registerRuntime(commands.focusElementNoteList.declaration.name, commands.focusElementNoteList.runtime(listRef));
		return () => {
			CommandService.instance().unregisterRuntime(commands.focusElementNoteList.declaration.name);
		};
	}, []);

	const onItemContextMenu = useOnContextMenu(
		props.selectedNoteIds,
		props.selectedFolderId,
		props.notes,
		props.dispatch,
		props.watchedNoteFiles,
		props.plugins,
		props.customCss
	);

	const renderFiller = (key: string, height: number) => {
		return <div key={key} style={{ height: height }}></div>;
	};

	const renderEmptyList = () => {
		if (props.notes.length) return null;
		return <div className="emptylist">{props.folders.length ? _('No notes in here. Create one by clicking on "New note".') : _('There is currently no notebook. Create one by clicking on "New notebook".')}</div>;
	};

	const renderNotes = () => {
		if (!props.notes.length) return null;

		const output: JSX.Element[] = [];

		output.push(renderFiller('top', startNoteIndex * itemSize.height));

		for (let i = startNoteIndex; i <= endNoteIndex; i++) {
			const note = props.notes[i];
			const renderedNote = renderedNotes[note.id];

			output.push(
				<NoteListItem
					key={note.id}
					ref={el => itemRefs.current[note.id] = el}
					onClick={onNoteClick}
					onChange={listRenderer.onChange}
					noteId={note.id}
					noteHtml={renderedNote ? renderedNote.html : ''}
					itemSize={itemSize}
					style={noteItemStyle}
					onContextMenu={onItemContextMenu}
				/>
			);
		}

		output.push(renderFiller('bottom', (props.notes.length - endNoteIndex - 1) * itemSize.height));

		return output;
	};

	return (
		<div
			className="note-list"
			style={noteListStyle}
			ref={listRef}
			onScroll={onScroll}
			onKeyDown={onKeyDown}
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
