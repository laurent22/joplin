import React from 'react';
import FolderList from './folder-list.jsx';
import { connect } from 'react-redux';
import * as fi from 'models/folder-item.jsx';

class RootFolderListComponent extends React.Component {

	render() {
		return <FolderList expandedFolderIds={this.props.expandedFolderIds} level="0" parentId="0" items={this.props.items} selectedFolderId={this.props.selectedFolderId} />
	}
	
}

const mapStateToProps = function(state) {
	return {
		items: fi.folders(state.items),
		selectedFolderId: state.selectedFolderId,
		expandedFolderIds: state.expandedFolderIds,
	};
}

const mapDispatchToProps = function(dispatch) {
	return {}
}

const RootFolderList = connect(
	mapStateToProps,
	mapDispatchToProps
)(RootFolderListComponent)

export default RootFolderList