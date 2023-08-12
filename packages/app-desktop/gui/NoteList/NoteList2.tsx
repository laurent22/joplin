import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useMemo, useCallback, useState } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
const { connect } = require('react-redux');
import { ItemFlow, Props } from './utils/types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
import defaultListRenderer from './utils/defaultListRenderer';
import NoteListItem from '../NoteListItem/NoteListItem';
import useRenderedNotes from './utils/useRenderedNote';
import useItemCss from './utils/useItemCss';
import useOnContextMenu from '../NoteListItem/utils/useOnContextMenu';
import useVisibleRange from './utils/useVisibleRange';

const NoteList = (props: Props) => {
	const [scrollTop, setScrollTop] = useState(0);

	const listRenderer = defaultListRenderer;

	if (listRenderer.flow !== ItemFlow.TopToBottom) throw new Error('Not implemented');

	const itemSize: Size = useMemo(() => {
		return listRenderer.itemSize;
	}, [listRenderer.itemSize]);

	const [startNoteIndex, endNoteIndex] = useVisibleRange(scrollTop, props.size, itemSize, props.notes.length);

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

	const onNoteClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const noteId = event.currentTarget.getAttribute('data-note-id');

		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			props.dispatch({
				type: 'NOTE_SELECT_TOGGLE',
				id: noteId,
			});
		} else if (event.shiftKey) {
			event.preventDefault();
			props.dispatch({
				type: 'NOTE_SELECT_EXTEND',
				id: noteId,
			});
		} else {
			props.dispatch({
				type: 'NOTE_SELECT',
				id: noteId,
			});
		}
	}, [props.dispatch]);

	useItemCss(listRenderer.itemCss);

	const onItemContextMenu = useOnContextMenu(
		props.selectedNoteIds,
		props.selectedFolderId,
		props.notes,
		props.dispatch,
		props.watchedNoteFiles,
		props.plugins,
		props.customCss
	);

	const onScroll = useCallback((event: any) => {
		setScrollTop(event.target.scrollTop);
	}, []);

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
		<div className="note-list" style={noteListStyle} onScroll={onScroll}>
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
