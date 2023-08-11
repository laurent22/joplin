import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
const { connect } = require('react-redux');
import { ItemFlow, Props } from './utils/types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
import defaultListRenderer from './utils/defaultListRenderer';
import NoteListItem from './NoteListItem';
import useRenderedNotes from './utils/useRenderedNote';
import useItemCss from './utils/useItemCss';

const NoteList = (props: Props) => {
	const listRenderer = defaultListRenderer;

	if (listRenderer.flow !== ItemFlow.TopToBottom) throw new Error('Not implemented');

	const itemSize: Size = useMemo(() => {
		return listRenderer.itemSize;
	}, [listRenderer.itemSize]);

	const renderedNotes = useRenderedNotes(props.notes, props.selectedNoteIds, itemSize, listRenderer);

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

	const renderNotes = () => {
		const output: JSX.Element[] = [];

		for (const renderedNote of renderedNotes) {
			output.push(
				<NoteListItem
					key={renderedNote.id}
					onClick={onNoteClick}
					onChange={listRenderer.onChange}
					noteId={renderedNote.id}
					noteHtml={renderedNote.html}
					itemSize={itemSize}
					style={noteItemStyle}
				/>
			);
		}

		return output;
	};

	return (
		<div className="note-list" style={noteListStyle}>
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
