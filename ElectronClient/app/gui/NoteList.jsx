const { ItemList } = require('./ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');

class NoteListComponent extends React.Component {

	itemRenderer(index, item) {
		const onClick = (item) => {
			this.props.dispatch({
				type: 'NOTES_SELECT',
				noteId: item.id,
			});
		}

		let classes = ['item'];
		classes.push(index % 2 === 0 ? 'even' : 'odd');
		if (this.props.selectedNoteId === item.id) classes.push('selected');
		return <div onClick={() => { onClick(item) }} className={classes.join(' ')} key={index}>{item.title + ' ' + item.id.substr(0,4)}</div>
	}

	render() {
		return (
			<ItemList
				itemHeight={this.props.itemHeight}
				style={this.props.style}
				className={"note-list"}
				items={this.props.notes}
				itemRenderer={ (index, item) => { return this.itemRenderer(index, item) } }
			></ItemList>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		notes: state.notes,
		selectedNoteId: state.selectedNoteId,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };