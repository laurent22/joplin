import * as React from 'react';
import { useMemo, useState, useCallback, memo } from 'react';
import { AppState } from '../../app.reducer';
// import { _ } from '@joplin/lib/locale';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
const { connect } = require('react-redux');
import { Props } from './types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
import { htmlentities } from '@joplin/utils/html';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

// enum ItemFlow {
// 	TopToBottom = 'topToBottom',
// 	LeftToRight = 'leftToRight',
// }

interface RenderedNote {
	id: string;
	html: string;
}

const useRenderedNotes = (notes: NoteEntity[], selectedNoteIds: string[], itemSize: Size) => {
	const initialValue = notes.map(n => {
		return {
			id: n.id,
			html: '',
		};
	});

	const [renderedNotes, setRenderedNotes] = useState<RenderedNote[]>(initialValue);

	useAsyncEffect(async (event) => {
		const newRenderedNotes: RenderedNote[] = [];

		const renderCheckbox = (itemHeight: number) => {
			return `
				<div class="checkbox" style="height: ${itemHeight}px;">
					<input type="checkbox" style="margin: 0px 5px 1px 0px;">
				</div>
			`;
		};

		const renderTitle = (noteId: string, title: string) => {
			return `
				<a href="#" class="title" draggable="true" data-id="${noteId}" style="">
					<span>${htmlentities(title)}</span
				</a>
			`;
		};

		for (const note of notes) {
			const selected = selectedNoteIds.includes(note.id);

			newRenderedNotes.push({
				id: note.id,
				html: `
					<div class="content -default ${selected ? '-selected' : ''}">
						${renderCheckbox(itemSize.height)}
						${renderTitle(note.id, note.title)}
					</div>
				`,
			});
		}

		if (event.cancelled) return null;

		setRenderedNotes(newRenderedNotes);
	}, [notes, selectedNoteIds, itemSize]);

	return renderedNotes;
};

interface NoteItemProps {
	onClick: React.MouseEventHandler<HTMLDivElement>;
	noteId: string;
	noteHtml: string;
	style: React.CSSProperties;
}

const NoteItem = memo((props: NoteItemProps) => {
	return <div
		onClick={props.onClick}
		data-note-id={props.noteId}
		className="note-list-item"
		style={props.style}
		dangerouslySetInnerHTML={{ __html: props.noteHtml }}
	></div>;
});

const NoteListComponent = (props: Props) => {
	// const itemDirection:ItemFlow = ItemFlow.TopToBottom;

	const itemSize: Size = useMemo(() => {
		return {
			width: 0,
			height: 34,
		};
	}, []);

	const renderedNotes = useRenderedNotes(props.notes, props.selectedNoteIds, itemSize);

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

	const renderNotes = () => {
		const output: JSX.Element[] = [];

		for (const renderedNote of renderedNotes) {
			output.push(
				<NoteItem
					key={renderedNote.id}
					onClick={onNoteClick}
					noteId={renderedNote.id}
					noteHtml={renderedNote.html}
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

export default connect(mapStateToProps)(NoteListComponent);
