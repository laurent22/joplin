const { ItemList } = require('./ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');
const { time } = require('lib/time-utils.js');
const { themeStyle } = require('../theme.js');
const BaseModel = require('lib/BaseModel');
const markJsUtils = require('lib/markJsUtils');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const eventManager = require('../eventManager');
const InteropService = require('lib/services/InteropService');
const InteropServiceHelper = require('../InteropServiceHelper.js');
const Search = require('lib/models/Search');
const Mark = require('mark.js/dist/mark.min.js');
const SearchEngine = require('lib/services/SearchEngine');
const { replaceRegexDiacritics, pregQuote } = require('lib/string-utils');

class NoteListComponent extends React.Component {

	constructor() {
		super();

		this.itemRenderer = this.itemRenderer.bind(this);
	}

	style() {
		const theme = themeStyle(this.props.theme);

		const itemHeight = 34;

		let style = {
			root: {
				backgroundColor: theme.backgroundColor,
			},
			listItem: {
				height: itemHeight,
				boxSizing: 'border-box',
				display: 'flex',
				alignItems: 'stretch',
				backgroundColor: theme.backgroundColor,
				borderBottom: '1px solid ' + theme.dividerColor,
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

		const notes = noteIds.map((id) => BaseModel.byId(this.props.notes, id));

		let hasEncrypted = false;
		for (let i = 0; i < notes.length; i++) {
			if (!!notes[i].encryption_applied) hasEncrypted = true;
		}

		const menu = new Menu()

		if (!hasEncrypted) {
			menu.append(new MenuItem({label: _('Add or remove tags'), enabled: noteIds.length === 1, click: async () => {
				this.props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'setTags',
					noteId: noteIds[0],
				});
			}}));

			menu.append(new MenuItem({label: _('Duplicate'), click: async () => {
				for (let i = 0; i < noteIds.length; i++) {
					const note = await Note.load(noteIds[i]);
					await Note.duplicate(noteIds[i], {
						uniqueTitle: _('%s - Copy', note.title),
					});
				}
			}}));

			if (noteIds.length <= 1) {
				menu.append(new MenuItem({label: _('Switch between note and to-do type'), click: async () => {
					for (let i = 0; i < noteIds.length; i++) {
						const note = await Note.load(noteIds[i]);
						await Note.save(Note.toggleIsTodo(note), { userSideValidation: true });
						eventManager.emit('noteTypeToggle', { noteId: note.id });
					}
				}}));
			} else {
				const switchNoteType = async (noteIds, type) => {
					for (let i = 0; i < noteIds.length; i++) {
						const note = await Note.load(noteIds[i]);
						const newNote = Note.changeNoteType(note, type);
						if (newNote === note) continue;
						await Note.save(newNote, { userSideValidation: true });
						eventManager.emit('noteTypeToggle', { noteId: note.id });
					}
				}

				menu.append(new MenuItem({label: _('Switch to note type'), click: async () => {
					await switchNoteType(noteIds, 'note');
				}}));

				menu.append(new MenuItem({label: _('Switch to to-do type'), click: async () => {
					await switchNoteType(noteIds, 'todo');
				}}));
			}

			menu.append(new MenuItem({label: _('Copy Markdown link'), click: async () => {
				const { clipboard } = require('electron');
				const links = [];
				for (let i = 0; i < noteIds.length; i++) {
					const note = await Note.load(noteIds[i]);
					links.push(Note.markdownTag(note));
				}
				clipboard.writeText(links.join(' '));
			}}));

			const exportMenu = new Menu();

			const ioService = new InteropService();
			const ioModules = ioService.modules();
			for (let i = 0; i < ioModules.length; i++) {
				const module = ioModules[i];
				if (module.type !== 'exporter') continue;

				exportMenu.append(new MenuItem({ label: module.fullLabel() , click: async () => {
					await InteropServiceHelper.export(this.props.dispatch.bind(this), module, { sourceNoteIds: noteIds });
				}}));
			}

			if (noteIds.length === 1) {
				exportMenu.append(new MenuItem({ label: 'PDF - ' + _('PDF File') , click: () => {
					this.props.dispatch({
						type: 'WINDOW_COMMAND',
						name: 'exportPdf',
					});
				}}));
			}

			const exportMenuItem = new MenuItem({label: _('Export'), submenu: exportMenu});

			menu.append(exportMenuItem);
		}

		menu.append(new MenuItem({label: _('Delete'), click: async () => {
			const ok = bridge().showConfirmMessageBox(noteIds.length > 1 ? _('Delete notes?') : _('Delete note?'));
			if (!ok) return;
			await Note.batchDelete(noteIds);
		}}));

		menu.popup(bridge().window());
	}

	itemRenderer(item) {
		const theme = themeStyle(this.props.theme);
		const width = this.props.style.width;

		const onTitleClick = async (event, item) => {
			if (event.ctrlKey) {
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

		const onDragStart = (event) => {
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

		const onCheckboxClick = async (event) => {
			const checked = event.target.checked;
			const newNote = {
				id: item.id,
				todo_completed: checked ? time.unixMs() : 0,
			}
			await Note.save(newNote, { userSideValidation: true });
			eventManager.emit('todoToggle', { noteId: item.id });
		}

		const hPadding = 10;

		let highlightedWords = [];
		if (this.props.notesParentType === 'Search') {
			const query = BaseModel.byId(this.props.searches, this.props.selectedSearchId);
			if (query) {
				const parsedQuery = SearchEngine.instance().parseQuery(query.query_pattern);
				highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);
			}
		}

		let style = Object.assign({ width: width }, this.style().listItem);

		if (this.props.selectedNoteIds.indexOf(item.id) >= 0) {
			style = Object.assign(style, this.style().listItemSelected);
		}

		// Setting marginBottom = 1 because it makes the checkbox looks more centered, at least on Windows
		// but don't know how it will look in other OSes.
		const checkbox = item.is_todo ? 
			<div style={{display: 'flex', height: style.height, alignItems: 'center', paddingLeft: hPadding}}>
				<input style={{margin:0, marginBottom:1}} type="checkbox" defaultChecked={!!item.todo_completed} onClick={(event) => { onCheckboxClick(event, item) }}/>
			</div>
		: null;

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
			titleComp = <span dangerouslySetInnerHTML={{ __html: titleElement.outerHTML }}></span>
		} else {
			titleComp = <span>{displayTitle}</span>
		}

		const watchedIconStyle = {
			paddingRight: 4,
			color: theme.color,
		};
		const watchedIcon = this.props.watchedNoteFiles.indexOf(item.id) < 0 ? null : (
			<i style={watchedIconStyle} className={"fa fa-external-link"}></i>
		);

		// Need to include "todo_completed" in key so that checkbox is updated when
		// item is changed via sync.		
		return <div key={item.id + '_' + item.todo_completed} style={style}>
			{checkbox}
			<a
				className="list-item"
				onContextMenu={(event) => this.itemContextMenu(event)}
				href="#"
				draggable={true}
				style={listItemTitleStyle}
				onClick={(event) => { onTitleClick(event, item) }}
				onDragStart={(event) => onDragStart(event) }
				data-id={item.id}
			>
			{watchedIcon}
			{titleComp}
			</a>
		</div>
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = this.props.style;
		let notes = this.props.notes.slice();

		if (!notes.length) {
			const padding = 10;
			const emptyDivStyle = Object.assign({
				padding: padding + 'px',
				fontSize: theme.fontSize,
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				fontFamily: theme.fontFamily,
			}, style);
			emptyDivStyle.width = emptyDivStyle.width - padding * 2;
			emptyDivStyle.height = emptyDivStyle.height - padding * 2;
			return <div style={emptyDivStyle}>{ this.props.folders.length ? _('No notes in here. Create one by clicking on "New note".') : _('There is currently no notebook. Create one by clicking on "New notebook".')}</div>
		}

		return (
			<ItemList
				itemHeight={this.style().listItem.height}
				style={style}
				className={"note-list"}
				items={notes}
				itemRenderer={this.itemRenderer}
			></ItemList>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		notes: state.notes,
		folders: state.folders,
		selectedNoteIds: state.selectedNoteIds,
		theme: state.settings.theme,
		notesParentType: state.notesParentType,
		searches: state.searches,
		selectedSearchId: state.selectedSearchId,
		watchedNoteFiles: state.watchedNoteFiles,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };