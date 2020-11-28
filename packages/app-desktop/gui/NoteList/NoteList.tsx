import { AppState } from '../../app';
import eventManager from '@joplin/lib/eventManager';
import NoteListUtils from '../utils/NoteListUtils';
import { _ } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import BaseModel from '@joplin/lib/BaseModel';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';
import NoteListItem from '../NoteListItem';
import CommandService from '@joplin/lib/services/CommandService.js';
import shim from '@joplin/lib/shim';
import styled from 'styled-components';
import { themeStyle } from '@joplin/lib/theme';
const React = require('react');

const { ItemList } = require('../ItemList.min.js');
const { connect } = require('react-redux');
const Note = require('@joplin/lib/models/Note');
const Folder = require('@joplin/lib/models/Folder');

const commands = [
	require('./commands/focusElementNoteList'),
];

const StyledRoot = styled.div`
	width: 100%;
	height: 100%;
	background-color: ${(props: any) => props.theme.backgroundColor3};
	border-right: 1px solid ${(props: any) => props.theme.dividerColor};
`;

class NoteListComponent extends React.Component {
	constructor() {
		super();

		CommandService.instance().componentRegisterCommands(this, commands);

		this.itemHeight = 34;

		this.state = {
			dragOverTargetNoteIndex: null,
			width: 0,
			height: 0,
		};

		this.noteListRef = React.createRef();
		this.itemListRef = React.createRef();
		this.itemAnchorRefs_ = {};

		this.renderItem = this.renderItem.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.noteItem_titleClick = this.noteItem_titleClick.bind(this);
		this.noteItem_noteDragOver = this.noteItem_noteDragOver.bind(this);
		this.noteItem_noteDrop = this.noteItem_noteDrop.bind(this);
		this.noteItem_checkboxClick = this.noteItem_checkboxClick.bind(this);
		this.noteItem_dragStart = this.noteItem_dragStart.bind(this);
		this.onGlobalDrop_ = this.onGlobalDrop_.bind(this);
		this.registerGlobalDragEndEvent_ = this.registerGlobalDragEndEvent_.bind(this);
		this.unregisterGlobalDragEndEvent_ = this.unregisterGlobalDragEndEvent_.bind(this);
		this.itemContextMenu = this.itemContextMenu.bind(this);
		this.resizableLayout_resize = this.resizableLayout_resize.bind(this);
	}

	style() {
		if (this.styleCache_ && this.styleCache_[this.props.themeId]) return this.styleCache_[this.props.themeId];

		const theme = themeStyle(this.props.themeId);

		const style = {
			root: {
				backgroundColor: theme.backgroundColor,
			},
			listItem: {
				maxWidth: '100%',
				height: this.itemHeight,
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

		this.styleCache_ = {};
		this.styleCache_[this.props.themeId] = style;

		return style;
	}

	itemContextMenu(event: any) {
		const currentItemId = event.currentTarget.getAttribute('data-id');
		if (!currentItemId) return;

		let noteIds = [];
		if (this.props.selectedNoteIds.indexOf(currentItemId) < 0) {
			noteIds = [currentItemId];
		} else {
			noteIds = this.props.selectedNoteIds;
		}

		if (!noteIds.length) return;

		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: this.props.notes,
			dispatch: this.props.dispatch,
			watchedNoteFiles: this.props.watchedNoteFiles,
			plugins: this.props.plugins,
			inConflictFolder: this.props.selectedFolderId === Folder.conflictFolderId(),
		});

		menu.popup(bridge().window());
	}

	onGlobalDrop_() {
		this.unregisterGlobalDragEndEvent_();
		this.setState({ dragOverTargetNoteIndex: null });
	}

	registerGlobalDragEndEvent_() {
		if (this.globalDragEndEventRegistered_) return;
		this.globalDragEndEventRegistered_ = true;
		document.addEventListener('dragend', this.onGlobalDrop_);
	}

	unregisterGlobalDragEndEvent_() {
		this.globalDragEndEventRegistered_ = false;
		document.removeEventListener('dragend', this.onGlobalDrop_);
	}

	dragTargetNoteIndex_(event: any) {
		return Math.abs(Math.round((event.clientY - this.itemListRef.current.offsetTop() + this.itemListRef.current.offsetScroll()) / this.itemHeight));
	}

	noteItem_noteDragOver(event: any) {
		if (this.props.notesParentType !== 'Folder') return;

		const dt = event.dataTransfer;

		if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
			event.preventDefault();
			const newIndex = this.dragTargetNoteIndex_(event);
			if (this.state.dragOverTargetNoteIndex === newIndex) return;
			this.registerGlobalDragEndEvent_();
			this.setState({ dragOverTargetNoteIndex: newIndex });
		}
	}

	async noteItem_noteDrop(event: any) {
		if (this.props.notesParentType !== 'Folder') return;

		if (this.props.noteSortOrder !== 'order') {
			const doIt = await bridge().showConfirmMessageBox(_('To manually sort the notes, the sort order must be changed to "%s" in the menu "%s" > "%s"', _('Custom order'), _('View'), _('Sort notes by')), {
				buttons: [_('Do it now'), _('Cancel')],
			});
			if (!doIt) return;

			Setting.setValue('notes.sortOrder.field', 'order');
			return;
		}

		// TODO: check that parent type is folder

		const dt = event.dataTransfer;
		this.unregisterGlobalDragEndEvent_();
		this.setState({ dragOverTargetNoteIndex: null });

		const targetNoteIndex = this.dragTargetNoteIndex_(event);
		const noteIds = JSON.parse(dt.getData('text/x-jop-note-ids'));

		Note.insertNotesAt(this.props.selectedFolderId, noteIds, targetNoteIndex);
	}


	async noteItem_checkboxClick(event: any, item: any) {
		const checked = event.target.checked;
		const newNote = {
			id: item.id,
			todo_completed: checked ? time.unixMs() : 0,
		};
		await Note.save(newNote, { userSideValidation: true });
		eventManager.emit('todoToggle', { noteId: item.id, note: newNote });
	}

	async noteItem_titleClick(event: any, item: any) {
		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			this.props.dispatch({
				type: 'NOTE_SELECT_TOGGLE',
				id: item.id,
			});
		} else if (event.shiftKey) {
			event.preventDefault();
			this.props.dispatch({
				type: 'NOTE_SELECT_EXTEND',
				id: item.id,
			});
		} else {
			this.props.dispatch({
				type: 'NOTE_SELECT',
				id: item.id,
			});
		}
	}

	noteItem_dragStart(event: any) {
		let noteIds = [];

		// Here there is two cases:
		// - If multiple notes are selected, we drag the group
		// - If only one note is selected, we drag the note that was clicked on (which might be different from the currently selected note)
		if (this.props.selectedNoteIds.length >= 2) {
			noteIds = this.props.selectedNoteIds;
		} else {
			const clickedNoteId = event.currentTarget.getAttribute('data-id');
			if (clickedNoteId) noteIds.push(clickedNoteId);
		}

		if (!noteIds.length) return;

		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-note-ids', JSON.stringify(noteIds));
	}

	renderItem(item: any, index: number) {
		const highlightedWords = () => {
			if (this.props.notesParentType === 'Search') {
				const query = BaseModel.byId(this.props.searches, this.props.selectedSearchId);
				if (query) {
					return this.props.highlightedWords;
				}
			}
			return [];
		};

		if (!this.itemAnchorRefs_[item.id]) this.itemAnchorRefs_[item.id] = React.createRef();
		const ref = this.itemAnchorRefs_[item.id];

		return <NoteListItem
			ref={ref}
			key={item.id}
			style={this.style()}
			item={item}
			index={index}
			themeId={this.props.themeId}
			width={this.state.width}
			height={this.itemHeight}
			dragItemIndex={this.state.dragOverTargetNoteIndex}
			highlightedWords={highlightedWords()}
			isProvisional={this.props.provisionalNoteIds.includes(item.id)}
			isSelected={this.props.selectedNoteIds.indexOf(item.id) >= 0}
			isWatched={this.props.watchedNoteFiles.indexOf(item.id) < 0}
			itemCount={this.props.notes.length}
			onCheckboxClick={this.noteItem_checkboxClick}
			onDragStart={this.noteItem_dragStart}
			onNoteDragOver={this.noteItem_noteDragOver}
			onNoteDrop={this.noteItem_noteDrop}
			onTitleClick={this.noteItem_titleClick}
			onContextMenu={this.itemContextMenu}
		/>;
	}

	itemAnchorRef(itemId: string) {
		if (this.itemAnchorRefs_[itemId] && this.itemAnchorRefs_[itemId].current) return this.itemAnchorRefs_[itemId].current;
		return null;
	}

	componentDidUpdate(prevProps: any) {
		if (prevProps.selectedNoteIds !== this.props.selectedNoteIds && this.props.selectedNoteIds.length === 1) {
			const id = this.props.selectedNoteIds[0];
			const doRefocus = this.props.notes.length < prevProps.notes.length;

			for (let i = 0; i < this.props.notes.length; i++) {
				if (this.props.notes[i].id === id) {
					this.itemListRef.current.makeItemIndexVisible(i);
					if (doRefocus) {
						const ref = this.itemAnchorRef(id);
						if (ref) ref.focus();
					}
					break;
				}
			}
		}

		if (prevProps.visible !== this.props.visible) {
			this.updateSizeState();
		}
	}

	scrollNoteIndex_(keyCode: any, ctrlKey: any, metaKey: any, noteIndex: any) {

		if (keyCode === 33) {
			// Page Up
			noteIndex -= (this.itemListRef.current.visibleItemCount() - 1);

		} else if (keyCode === 34) {
			// Page Down
			noteIndex += (this.itemListRef.current.visibleItemCount() - 1);

		} else if ((keyCode === 35 && ctrlKey) || (keyCode === 40 && metaKey)) {
			// CTRL+End, CMD+Down
			noteIndex = this.props.notes.length - 1;

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
		if (noteIndex > this.props.notes.length - 1) noteIndex = this.props.notes.length - 1;
		return noteIndex;
	}

	async onKeyDown(event: any) {
		const keyCode = event.keyCode;
		const noteIds = this.props.selectedNoteIds;

		if (noteIds.length > 0 && (keyCode === 40 || keyCode === 38 || keyCode === 33 || keyCode === 34 || keyCode === 35 || keyCode == 36)) {
			// DOWN / UP / PAGEDOWN / PAGEUP / END / HOME
			const noteId = noteIds[0];
			let noteIndex = BaseModel.modelIndexById(this.props.notes, noteId);

			noteIndex = this.scrollNoteIndex_(keyCode, event.ctrlKey, event.metaKey, noteIndex);

			const newSelectedNote = this.props.notes[noteIndex];

			this.props.dispatch({
				type: 'NOTE_SELECT',
				id: newSelectedNote.id,
			});

			this.itemListRef.current.makeItemIndexVisible(noteIndex);

			this.focusNoteId_(newSelectedNote.id);

			event.preventDefault();
		}

		if (noteIds.length && (keyCode === 46 || (keyCode === 8 && event.metaKey))) {
			// DELETE / CMD+Backspace
			event.preventDefault();
			await NoteListUtils.confirmDeleteNotes(noteIds);
		}

		if (noteIds.length && keyCode === 32) {
			// SPACE
			event.preventDefault();

			const notes = BaseModel.modelsByIds(this.props.notes, noteIds);
			const todos = notes.filter((n: any) => !!n.is_todo);
			if (!todos.length) return;

			for (let i = 0; i < todos.length; i++) {
				const toggledTodo = Note.toggleTodoCompleted(todos[i]);
				await Note.save(toggledTodo);
			}

			this.focusNoteId_(todos[0].id);
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

			this.props.dispatch({
				type: 'NOTE_SELECT_ALL',
			});
		}
	}

	focusNoteId_(noteId: string) {
		// - We need to focus the item manually otherwise focus might be lost when the
		//   list is scrolled and items within it are being rebuilt.
		// - We need to use an interval because when leaving the arrow pressed, the rendering
		//   of items might lag behind and so the ref is not yet available at this point.
		if (!this.itemAnchorRef(noteId)) {
			if (this.focusItemIID_) shim.clearInterval(this.focusItemIID_);
			this.focusItemIID_ = shim.setInterval(() => {
				if (this.itemAnchorRef(noteId)) {
					this.itemAnchorRef(noteId).focus();
					shim.clearInterval(this.focusItemIID_);
					this.focusItemIID_ = null;
				}
			}, 10);
		} else {
			this.itemAnchorRef(noteId).focus();
		}
	}

	updateSizeState() {
		this.setState({
			width: this.noteListRef.current.clientWidth,
			height: this.noteListRef.current.clientHeight,
		});
	}

	resizableLayout_resize() {
		this.updateSizeState();
	}

	componentDidMount() {
		this.props.resizableLayoutEventEmitter.on('resize', this.resizableLayout_resize);
		this.updateSizeState();
	}

	componentWillUnmount() {
		if (this.focusItemIID_) {
			shim.clearInterval(this.focusItemIID_);
			this.focusItemIID_ = null;
		}

		this.props.resizableLayoutEventEmitter.off('resize', this.resizableLayout_resize);

		CommandService.instance().componentUnregisterCommands(commands);
	}

	renderEmptyList() {
		if (this.props.notes.length) return null;

		const theme = themeStyle(this.props.themeId);
		const padding = 10;
		const emptyDivStyle = {
			padding: `${padding}px`,
			fontSize: theme.fontSize,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontFamily: theme.fontFamily,
		};
		// emptyDivStyle.width = emptyDivStyle.width - padding * 2;
		// emptyDivStyle.height = emptyDivStyle.height - padding * 2;
		return <div style={emptyDivStyle}>{this.props.folders.length ? _('No notes in here. Create one by clicking on "New note".') : _('There is currently no notebook. Create one by clicking on "New notebook".')}</div>;
	}

	renderItemList(style: any) {
		if (!this.props.notes.length) return null;

		return (
			<ItemList
				ref={this.itemListRef}
				disabled={this.props.isInsertingNotes}
				itemHeight={this.style().listItem.height}
				className={'note-list'}
				items={this.props.notes}
				style={style}
				itemRenderer={this.renderItem}
				onKeyDown={this.onKeyDown}
			/>
		);
	}

	render() {
		if (!this.props.size) throw new Error('props.size is required');

		return (
			<StyledRoot ref={this.noteListRef}>
				{this.renderEmptyList()}
				{this.renderItemList(this.props.size)}
			</StyledRoot>
		);
	}
}

const mapStateToProps = (state: AppState) => {
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
		highlightedWords: state.highlightedWords,
		plugins: state.pluginService.plugins,
	};
};

export default connect(mapStateToProps)(NoteListComponent);
