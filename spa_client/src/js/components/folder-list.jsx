import React from 'react';
import Folder from './folder.jsx';
import { connect } from 'react-redux';
import * as fi from 'models/folder-item.jsx';

class FolderListComponent extends React.Component {

	render() {
		let elements = [];
		let level = Number(this.props.level) + 1;
		let className = 'level-' + level;
		className += ' folder-list';

		this.props.items.forEach((item, index) => {
			if (this.props.parentId != item.parent_id) return;
			let selected = this.props.selectedFolderId == item.id;
			let children = fi.children(this.props.items, item.id);
			elements.push(<Folder level={level} title={item.title} key={item.id} id={item.id} expandedFolderIds={this.props.expandedFolderIds} selectedFolderId={this.props.selectedFolderId} children={children} />);
		});

		return <div className={className}>{elements}</div>
	}
	
}

const mapStateToProps = function(state) {
	return {}
}

const mapDispatchToProps = function(dispatch) {
	return {}
}

const FolderList = connect(
	mapStateToProps,
	mapDispatchToProps
)(FolderListComponent)

export default FolderList