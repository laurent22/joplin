import * as React from 'react';
import { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { AppState } from '../../app.reducer';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
const { connect } = require('react-redux');
import { ItemFlow, ListRenderer, ListRendererDepependency, OnChangeHandler, Props } from './types';
import { itemIsReadOnlySync, ItemSlice } from '@joplin/lib/models/utils/readOnly';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import ItemChange from '@joplin/lib/models/ItemChange';
import { Size } from '@joplin/utils/types';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import defaultListRenderer from './defaultListRenderer';
import * as Mustache from 'mustache';
import { waitForElement } from '@joplin/lib/dom';
import { msleep } from '@joplin/utils/time';

interface RenderedNote {
	id: string;
	html: string;
}

const useRenderedNotes = (notes: NoteEntity[], selectedNoteIds: string[], itemSize: Size, listRenderer: ListRenderer) => {
	const initialValue = notes.map(n => {
		return {
			id: n.id,
			html: '',
		};
	});

	const [renderedNotes, setRenderedNotes] = useState<RenderedNote[]>(initialValue);

	const prepareViewProps = async (dependencies: ListRendererDepependency[], note: NoteEntity, itemSize: Size, selected: boolean) => {
		const output: any = {};
		for (const dep of dependencies) {

			if (dep.startsWith('note.')) {
				const splitted = dep.split('.');
				if (splitted.length !== 2) throw new Error(`Invalid dependency name: ${dep}`);
				const propName = splitted.pop();
				if (!output.note) output.note = {};
				if (!(propName in note)) throw new Error(`Invalid dependency name: ${dep}`);
				output.note[propName] = (note as any)[propName];
			}

			if (dep.startsWith('item.size.')) {
				const splitted = dep.split('.');
				if (splitted.length !== 3) throw new Error(`Invalid dependency name: ${dep}`);
				const propName = splitted.pop();
				if (!output.item) output.item = {};
				if (!output.item.size) output.item.size = {};
				if (!(propName in itemSize)) throw new Error(`Invalid dependency name: ${dep}`);
				output.item.size[propName] = (itemSize as any)[propName];
			}

			if (dep === 'item.selected') {
				if (!output.item) output.item = {};
				output.item.selected = selected;
			}
		}

		return output;
	};

	useAsyncEffect(async (event) => {
		const newRenderedNotes: RenderedNote[] = [];

		for (const note of notes) {
			const view = await listRenderer.onRenderNote(await prepareViewProps(
				listRenderer.dependencies,
				note,
				itemSize,
				selectedNoteIds.includes(note.id)
			));

			newRenderedNotes.push({
				id: note.id,
				html: Mustache.render(listRenderer.itemTemplate, view),
			});
		}

		if (event.cancelled) return null;

		setRenderedNotes(newRenderedNotes);
	}, [notes, selectedNoteIds, itemSize]);

	return renderedNotes;
};

interface NoteItemProps {
	onClick: React.MouseEventHandler<HTMLDivElement>;
	onChange: OnChangeHandler;
	noteId: string;
	noteHtml: string;
	style: React.CSSProperties;
}

const NoteItem = memo((props: NoteItemProps) => {
	const [rootElement, setRootElement] = useState<HTMLDivElement>(null);
	const [itemElement, setItemElement] = useState<HTMLDivElement>(null);

	const elementId = `list-note-${props.noteId}`;
	const idPrefix = 'user-note-list-item-';

	const onCheckboxChange = useCallback((event: any) => {
		const internalId: string = event.currentTarget.getAttribute('id');
		const userId = internalId.substring(idPrefix.length);
		void props.onChange({ noteId: props.noteId }, userId, { value: event.currentTarget.checked });
	}, [props.onChange, props.noteId]);

	useAsyncEffect(async (event) => {
		const element = await waitForElement(document, elementId);
		if (event.cancelled) return;
		setRootElement(element);
	}, [document, elementId]);

	useEffect(() => {
		if (!rootElement) return () => {};

		const element = document.createElement('div');
		element.setAttribute('data-note-id', props.noteId);
		element.className = 'note-list-item';
		for (const [n, v] of Object.entries(props.style)) {
			(element.style as any)[n] = v;
		}
		element.innerHTML = props.noteHtml;
		element.addEventListener('click', props.onClick as any);

		rootElement.appendChild(element);

		setItemElement(element);

		return () => {
			// TODO: do event handlers need to be removed if the element is removed?
			// element.removeEventListener('click', props.onClick as any);
			element.remove();
		};
	}, [rootElement, props.noteHtml, props.noteId, props.style, props.onClick, onCheckboxChange]);

	useAsyncEffect(async (event) => {
		if (!itemElement) return;

		await msleep(1);
		if (event.cancelled) return;

		const inputs = itemElement.getElementsByTagName('input');

		const all = rootElement.getElementsByTagName('*');

		for (let i = 0; i < all.length; i++) {
			const e = all[i];
			if (e.getAttribute('id')) {
				e.setAttribute('id', idPrefix + e.getAttribute('id'));
			}
		}

		for (const input of inputs) {
			if (input.type === 'checkbox') {
				input.addEventListener('change', onCheckboxChange);
			}
		}
	}, [itemElement]);

	return <div id={elementId}></div>;
});

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

	useEffect(() => {
		const element = document.createElement('style');
		element.setAttribute('type', 'text/css');
		element.appendChild(document.createTextNode(`
			.note-list-item {
				${listRenderer.itemCss};
			}
		`));
		document.head.appendChild(element);
		return () => {
			element.remove();
		};
	}, [listRenderer.itemCss]);

	const renderNotes = () => {
		const output: JSX.Element[] = [];

		for (const renderedNote of renderedNotes) {
			output.push(
				<NoteItem
					key={renderedNote.id}
					onClick={onNoteClick}
					onChange={listRenderer.onChange}
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

export default connect(mapStateToProps)(NoteList);
