import React from 'react';
import { connect } from 'react-redux'
import FolderList from './folder-list.jsx';

class FolderComponent extends React.Component {

	render() {
		let selectedClass = this.props.selectedFolderId == this.props.id ? 'selected' : '';
		let elements = [];
		let key = 'note-name-' + this.props.id;

		elements.push(
			<div key={key} onClick={this.props.onClick.bind(this)} className={selectedClass} id="{this.props.id}">{this.props.title}</div>
		);

		var showChildren = this.props.children.length && this.props.expandedFolderIds.indexOf(this.props.id) >= 0;

		if (showChildren) {
			key = 'folder-list-' + this.props.id;
			elements.push(
				<FolderList key={key} level={this.props.level} parentId={this.props.id} items={this.props.children} selectedFolderId={this.props.selectedFolderId} />
			);
		}

		return <div>{elements}</div>
	}

}

const Folder = connect(
	function(state) { return {} },

	function(dispatch) {
		return {
			onClick: function(event) {
				dispatch({
					type: 'SELECT_FOLDER',
					id: this.props.id,
				});
				dispatch({
					type: 'TOGGLE_FOLDER',
					id: this.props.id,
				});
			}
		}
	}

)(FolderComponent)

export default Folder