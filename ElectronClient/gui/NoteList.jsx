const { ItemList } = require('./ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');
const { time } = require('lib/time-utils.js');
const { themeStyle } = require('../theme.js');
const BaseModel = require('lib/BaseModel');
const markJsUtils = require('lib/markJsUtils');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const eventManager = require('../eventManager');
const Mark = require('mark.js/dist/mark.min.js');
const SearchEngine = require('lib/services/SearchEngine');
const Note = require('lib/models/Note');
const NoteListUtils = require('./utils/NoteListUtils');
const { replaceRegexDiacritics, pregQuote } = require('lib/string-utils');

class NoteListComponent extends React.Component {
	constructor() {
		super();

		this.itemListRef = React.createRef();
		this.itemAnchorRefs_ = {};

		this.itemRenderer = this.itemRenderer.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
	}

	style() {
		const theme = themeStyle(this.props.theme);

		const itemHeight = 34;

		// Note: max-width is used to specifically prevent horizontal scrolling on Linux when the scrollbar is present in the note list.
		// Pull request: https://github.com/laurent22/joplin/pull/2062
		const itemWidth = '100%';

		let style = {
			root: {
				backgroundColor: theme.backgroundColor,
			},
			listItem: {
				maxWidth: itemWidth,
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

	itemRenderer(item) {
		const theme = themeStyle(this.props.theme);
		const width = this.props.style.width;

		const onTitleClick = async (event, item) => {
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
		};

		const onDragStart = event => {
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
		};

		const onCheckboxClick = async event => {
			const checked = event.target.checked;
			const newNote = {
				id: item.id,
				todo_completed: checked ? time.unixMs() : 0,
			};
			await Note.save(newNote, { userSideValidation: true });
			eventManager.emit('todoToggle', { noteId: item.id });
		};

		const hPadding = 10;

		let highlightedWords = [];
		if (this.props.notesParentType === 'Search') {
			const query = BaseModel.byId(this.props.searches, this.props.selectedSearchId);
			if (query) {
				const parsedQuery = SearchEngine.instance().parseQuery(query.query_pattern);
				highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);
			}
		}

		let style = Object.assign({ width: width, opacity: this.props.provisionalNoteIds.includes(item.id) ? 0.5 : 1 }, this.style().listItem);

		if (this.props.selectedNoteIds.indexOf(item.id) >= 0) {
			style = Object.assign(style, this.style().listItemSelected);
		}

		// Setting marginBottom = 1 because it makes the checkbox looks more centered, at least on Windows
		// but don't know how it will look in other OSes.
		const checkbox = item.is_todo ? (
			<div style={{ display: 'flex', height: style.height, alignItems: 'center', paddingLeft: hPadding }}>
				<input
					style={{ margin: 0, marginBottom: 1 }}
					type="checkbox"
					defaultChecked={!!item.todo_completed}
					onClick={event => {
						onCheckboxClick(event, item);
					}}
				/>
			</div>
		) : null;

		let listItemTitleStyle = Object.assign({}, this.style().listItemTitle);
		listItemTitleStyle.paddingLeft = !checkbox ? hPadding : 4;
		if (item.is_todo && !!item.todo_completed) listItemTitleStyle = Object.assign(listItemTitleStyle, this.style().listItemTitleCompleted);

		let displayTitle = Note.displayTitle(item);
		let titleComp = null;

		if (highlightedWords.length) {
			const titleElement = document.createElement('span');
			titleElement.textContent = displayTitle;
			const mark = new Mark(titleElement, {
				exclude: ['img'],
				acrossElements: true,
			});

			mark.unmark();

			for (let i = 0; i < highlightedWords.length; i++) {
				const w = highlightedWords[i];

				markJsUtils.markKeyword(mark, w, {
					pregQuote: pregQuote,
					replaceRegexDiacritics: replaceRegexDiacritics,
				});
			}

			// Note: in this case it is safe to use dangerouslySetInnerHTML because titleElement
			// is a span tag that we created and that contains data that's been inserted as plain text
			// with `textContent` so it cannot contain any XSS attacks. We use this feature because
			// mark.js can only deal with DOM elements.
			// https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
			titleComp = <span dangerouslySetInnerHTML={{ __html: titleElement.outerHTML }}></span>;
		} else {
			titleComp = <span>{displayTitle}</span>;
		}

		const watchedIconStyle = {
			paddingRight: 4,
			color: theme.color,
		};
		const watchedIcon = this.props.watchedNoteFiles.indexOf(item.id) < 0 ? null : <i style={watchedIconStyle} className={'fa fa-external-link'}></i>;

		if (!this.itemAnchorRefs_[item.id]) this.itemAnchorRefs_[item.id] = React.createRef();
		const ref = this.itemAnchorRefs_[item.id];

		// Need to include "todo_completed" in key so that checkbox is updated when
		// item is changed via sync.
		return (
			<div key={`${item.id}_${item.todo_completed}`} style={style}>
				{checkbox}
				<a
					ref={ref}
					className="list-item"
					onContextMenu={event => this.itemContextMenu(event)}
					href="#"
					draggable={true}
					style={listItemTitleStyle}
					onClick={event => {
						onTitleClick(event, item);
					}}
					onDragStart={event => onDragStart(event)}
					data-id={item.id}
				>
					{watchedIcon}
					{titleComp}
				</a>
			</div>
		);
	}

	itemAnchorRef(itemId) {
		if (this.itemAnchorRefs_[itemId] && this.itemAnchorRefs_[itemId].current) return this.itemAnchorRefs_[itemId].current;
		return null;
	}

	doCommand(command) {
		if (!command) return;

		let commandProcessed = true;

		if (command.name === 'focusElement' && command.target === 'noteList') {
			if (this.props.selectedNoteIds.length) {
				const ref = this.itemAnchorRef(this.props.selectedNoteIds[0]);
				if (ref) ref.focus();
			}
		} else {
			commandProcessed = false;
		}

		if (commandProcessed) {
			this.props.dispatch({
				type: 'WINDOW_COMMAND',
				name: null,
			});
		}
	}

	componentDidUpdate(prevProps) {
		if (prevProps.windowCommand !== this.props.windowCommand) {
			this.doCommand(this.props.windowCommand);
		}

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
				this.props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'sideBar',
				});
			} else {
				this.props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'focusElement',
					target: 'noteTitle',
				});
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
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;
		let notes = this.props.notes.slice();

		if (!notes.length) {
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

		return <ItemList ref={this.itemListRef} itemHeight={this.style().listItem.height} className={'note-list'} items={notes} style={style} itemRenderer={this.itemRenderer} onKeyDown={this.onKeyDown} />;
	}
}

const mapStateToProps = state => {
	return {
		notes: state.notes,
		folders: state.folders,
		selectedNoteIds: state.selectedNoteIds,
		theme: state.settings.theme,
		notesParentType: state.notesParentType,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
		watchedNoteFiles: state.watchedNoteFiles,
		windowCommand: state.windowCommand,
		provisionalNoteIds: state.provisionalNoteIds,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };
