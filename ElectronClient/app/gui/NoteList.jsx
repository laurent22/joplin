const { ItemList } = require('./ItemList.min.js');
const React = require('react');
const { connect } = require('react-redux');

class NoteListComponent extends React.Component {

	itemRenderer(index, item) {
		const onClick = () => {
			this.props.dispatch({
				type: 'NOTES_SELECT',
				noteId: item.id,
			});
		}

		let classes = ['item'];
		classes.push(index % 2 === 0 ? 'even' : 'odd');
		return <div onClick={() => { onClick() }} className={classes.join(' ')} key={index}>{item.title}</div>
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
	//let notes = [];
	//for (let i = 0; i < 100; i++) notes.push({ title: "Note " + i });

	return {
		notes: state.notes,
		//notes: notes,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };