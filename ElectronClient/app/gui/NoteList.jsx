const { ItemList } = require('./ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;

class NoteListComponent extends React.Component {

	itemContextMenu(event) {
		const noteId = event.target.getAttribute('data-id');
		if (!noteId) throw new Error('No data-id on element');

		const menu = new Menu()
		menu.append(new MenuItem({label: _('Delete'), click: async () => {
			const ok = bridge().showConfirmMessageBox(_('Delete note?'));
			if (!ok) return;
			await Note.delete(noteId);
		}}))
		menu.popup(bridge().window());
	}

	itemRenderer(index, item, theme) {
		const onClick = (item) => {
			this.props.dispatch({
				type: 'NOTE_SELECT',
				id: item.id,
			});
		}

		const style =  {
			height: this.props.itemHeight,
			display: 'block',
			cursor: 'pointer',
			backgroundColor: index % 2 === 0 ? theme.backgroundColor : theme.oddBackgroundColor,
			fontWeight: this.props.selectedNoteId === item.id ? 'bold' : 'normal',
		};

		return <a data-id={item.id} onContextMenu={(event) => this.itemContextMenu(event)} href="#" style={style} onClick={() => { onClick(item) }} key={index}>{item.title}</a>
	}

	render() {
		const theme = themeStyle(this.props.theme);

		return (
			<ItemList
				itemHeight={this.props.itemHeight}
				style={this.props.style}
				className={"note-list"}
				items={this.props.notes}
				itemRenderer={ (index, item) => { return this.itemRenderer(index, item, theme) } }
			></ItemList>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		notes: state.notes,
		selectedNoteId: state.selectedNoteId,
		theme: state.settings.theme,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };