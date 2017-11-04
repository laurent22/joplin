const { ItemList } = require('./ItemList.min.js');

class NoteListComponent extends React.Component {

	itemRenderer(index, item) {
		let classes = ['item'];
		classes.push(index % 2 === 0 ? 'even' : 'odd');
		return <div onClick={() => {console.info(item)}} className={classes.join(' ')} key={index}>{item.title}</div>
	}

	render() {
		return (
			<div className={"note-list"}>
				<h1>Notes</h1>
				<ItemList
					items={this.props.notes}
					itemRenderer={ (index, item) => { return this.itemRenderer(index, item) } }
				/>
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		notes: state.notes,
	};
};

const NoteList = connect(mapStateToProps)(NoteListComponent);

module.exports = { NoteList };