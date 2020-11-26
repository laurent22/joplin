const { ItemList } = require('../ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');
const { time } = require('lib/time-utils.js');
const { themeStyle } = require('lib/theme');
const BaseModel = require('lib/BaseModel');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const eventManager = require('lib/eventManager');
const SearchEngine = require('lib/services/searchengine/SearchEngine');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const NoteListUtils = require('../utils/NoteListUtils');
const NoteListItem = require('../NoteListItem').default;
const CommandService = require('lib/services/CommandService.js').default;

const commands = [
	require('./commands/focusElementNoteList'),
];

class NoteListComponent extends React.Component {
	constructor() {
		super();

		CommandService.instance().componentRegisterCommands(this, commands);

		this.itemHeight = 34;

		this.state = {
			dragOverTargetNoteIndex: null,
		};

		this.itemListRef = React.createRef();
		this.itemAnchorRefs_ = {};

		this.itemRenderer = this.itemRenderer.bind(this);
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
	}

	style() {
		if (this.styleCache_ && this.styleCache_[this.props.theme]) return this.styleCache_[this.props.theme];

		const theme = themeStyle(this.props.theme);

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
		this.styleCache_[this.props.theme] = style;

		return style;
	}

	itemContextMenu(event) {
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

	dragTargetNoteIndex_(event) {
		return Math.abs(Math.round((event.clientY - this.itemListRef.current.offsetTop()) / this.itemHeight));
	}

	noteItem_noteDragOver(event) {
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

	async noteItem_noteDrop(event) {
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


	async noteItem_checkboxClick(event, item) {
		const checked = event.target.checked;
		const newNote = {
			id: item.id,
			todo_completed: checked ? time.unixMs() : 0,
		};
		await Note.save(newNote, { userSideValidation: true });
		eventManager.emit('todoToggle', { noteId: item.id, note: newNote });
	}

	async noteItem_titleClick(event, item) {
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

	noteItem_dragStart(event) {
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

	itemRenderer(item, index) {
		const highlightedWords = () => {
			if (this.props.notesParentType === 'Search') {
				const query = BaseModel.byId(this.props.searches, this.props.selectedSearchId);
				if (query) {
					const parsedQuery = SearchEngine.instance().parseQuery(query.query_pattern);
					return SearchEngine.instance().allParsedQueryTerms(parsedQuery);
				}
			}
			return [];
		};

		if (!this.itemAnchorRefs_[item.id]) this.itemAnchorRefs_[item.id] = React.createRef();
		const ref = this.itemAnchorRefs_[item.id];

		return <NoteListItem
			ref={ref}
			key={item.id}
			style={this.style(this.props.theme)}
			item={item}
			index={index}
			theme={this.props.theme}
			width={this.props.style.width}
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

	itemAnchorRef(itemId) {
		if (this.itemAnchorRefs_[itemId] && this.itemAnchorRefs_[itemId].current) return this.itemAnchorRefs_[itemId].current;
		return null;
	}

	componentDidUpdate(prevProps) {
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
	}

	scrollNoteIndex_(keyCode, ctrlKey, metaKey, noteIndex) {

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

	async onKeyDown(event) {
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
			const todos = notes.filter(n => !!n.is_todo);
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
				CommandService.instance().execute('focusElement', { target: 'sideBar' });
			} else {
				CommandService.instance().execute('focusElement', { target: 'noteTitle' });
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

	focusNoteId_(noteId) {
		// - We need to focus the item manually otherwise focus might be lost when the
		//   list is scrolled and items within it are being rebuilt.
		// - We need to use an interval because when leaving the arrow pressed, the rendering
		//   of items might lag behind and so the ref is not yet available at this point.
		if (!this.itemAnchorRef(noteId)) {
			if (this.focusItemIID_) clearInterval(this.focusItemIID_);
			this.focusItemIID_ = setInterval(() => {
				if (this.itemAnchorRef(noteId)) {
					this.itemAnchorRef(noteId).focus();
					clearInterval(this.focusItemIID_);
					this.focusItemIID_ = null;
				}
			}, 10);
		} else {
			this.itemAnchorRef(noteId).focus();
		}
	}

	componentWillUnmount() {
		if (this.focusItemIID_) {
			clearInterval(this.focusItemIID_);
			this.focusItemIID_ = null;
		}

		CommandService.instance().componentUnregisterCommands(commands);
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;

		if (!this.props.notes.length) {
			const padding = 10;
			const emptyDivStyle = Object.assign(
				{
					padding: `${padding}px`,
					fontSize: theme.fontSize,
					color: theme.color,
					backgroundColor: theme.backgroundColor,
					fontFamily: theme.fontFamily,
				},
				style
			);
			emptyDivStyle.width = emptyDivStyle.width - padding * 2;
			emptyDivStyle.height = emptyDivStyle.height - padding * 2;
			return <div style={emptyDivStyle}>{this.props.folders.length ? _('No notes in here. Create one by clicking on "New note".') : _('There is currently no notebook. Create one by clicking on "New notebook".')}</div>;
		}

		return <ItemList
			ref={this.itemListRef}
			disabled={this.props.isInsertingNotes}
			itemHeight={this.style(this.props.theme).listItem.height}
			className={'note-list'}
			items={this.props.notes}
			style={style}
			itemRenderer={this.itemRenderer}
			onKeyDown={this.onKeyDown}
		/>;
	}
}

const mapStateToProps = state => {
	return {
		notes: state.notes,
		folders: state.folders,
		selectedNoteIds: state.selectedNoteIds,
		selectedFolderId: state.selectedFolderId,
		theme: state.settings.theme,
		notesParentType: state.notesParentType,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
		watchedNoteFiles: state.watchedNoteFiles,
		provisionalNoteIds: state.provisionalNoteIds,
		isInsertingNotes: state.isInsertingNotes,
		noteSortOrder: state.settings['notes.sortOrder.field'],
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };
