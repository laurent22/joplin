import React from 'react';
import { connect } from 'react-redux'

class NoteListItemComponent extends React.Component {

	render() {
		let className = this.props.selected ? 'selected' : '';
		return <div onClick={this.props.onClick.bind(this)} className={className}>{this.props.title}</div>
	}

}

const NoteListItem = connect(
	function(state) { return {} },
	function(dispatch) {
		return {
			onClick: function(event) {
				console.info(this.props.id);
				dispatch({
					type: 'SELECT_NOTE',
					id: this.props.id,
				});
			}
		}
	}
)(NoteListItemComponent)

export default NoteListItem