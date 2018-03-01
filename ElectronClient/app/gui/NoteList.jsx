const { ItemList } = require('./ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');
const { time } = require('lib/time-utils.js');
const { themeStyle } = require('../theme.js');
const BaseModel = require('lib/BaseModel');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const eventManager = require('../eventManager');
const InteropService = require('lib/services/InteropService');
const InteropServiceHelper = require('../InteropServiceHelper.js');

class NoteListComponent extends React.Component {

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

			menu.append(new MenuItem({label: _('Switch between note and to-do type'), click: async () => {
				for (let i = 0; i < noteIds.length; i++) {
					const note = await Note.load(noteIds[i]);
					await Note.save(Note.toggleIsTodo(note), { userSideValidation: true });
					eventManager.emit('noteTypeToggle', { noteId: note.id });
				}
			}}));

			menu.append(new MenuItem({label: _('Export'), click: async () => {
				const ioService = new InteropService();
				const module = ioService.moduleByFormat_('exporter', 'jex');
				await InteropServiceHelper.export(this.props.dispatch.bind(this), module, { sourceNoteIds: noteIds });
			}}));			
		}

		menu.append(new MenuItem({label: _('Delete'), click: async () => {
			const ok = bridge().showConfirmMessageBox(noteIds.length > 1 ? _('Delete notes?') : _('Delete note?'));
			if (!ok) return;
			await Note.batchDelete(noteIds);
		}}));

		menu.popup(bridge().window());
	}

	itemRenderer(item, theme, width) {
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
			const noteIds = this.props.selectedNoteIds;
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
			{Note.displayTitle(item)}
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
				itemRenderer={ (item) => { return this.itemRenderer(item, theme, style.width) } }
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
		// uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };