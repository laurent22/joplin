//const { BaseModel } = require('lib/base-model.js');

const React = require('react');
const { connect } = require('react-redux');

class NoteTextComponent extends React.Component {

	componentWillMount() {
		this.setState({
			note: null,
		});
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.noteId) this.reloadNote();
	}

	async reloadNote() {
		const note = this.props.noteId ? await Note.load(this.props.noteId) : null;
		this.setState({
			note: note,
		});
	}

	render() {
		const note = this.state.note;
		const body = note ? note.body : 'no note';

		return (
			<div style={this.props.style}>
				{ body }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		noteId: state.selectedNoteId,
		notes: state.notes,
	};
};

const NoteText = connect(mapStateToProps)(NoteTextComponent);

module.exports = { NoteText };