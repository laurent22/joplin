const React = require('react');
const { connect } = require('react-redux');
const shared = require('lib/components/shared/side-menu-shared.js');
const { Synchronizer } = require('lib/synchronizer.js');

class SideBarComponent extends React.Component {

	folderItem_click(folder) {
		this.props.dispatch({
			type: 'FOLDERS_SELECT',
			id: folder ? folder.id : null,
		});
	}

	tagItem_click(tag) {
		this.props.dispatch({
			type: 'TAGS_SELECT',
			id: tag ? tag.id : null,
		});
	}

	folderItem(folder, selected) {
		let classes = [];
		if (selected) classes.push('selected');
		return <div key={folder.id} className={classes.join(' ')} onClick={() => {this.folderItem_click(folder)}}>{folder.title}</div>
	}

	tagItem(tag, selected) {
		let classes = [];
		if (selected) classes.push('selected');
		return <div key={tag.id} className={classes.join(' ')} onClick={() => {this.tagItem_click(tag)}}>Tag: {tag.title}</div>
	}

	makeDivider(key) {
		return <div style={{height:2, backgroundColor:'blue' }} key={key}></div>
	}

	synchronizeButton(label) {
		return <div key="sync_button">{label}</div>
	}

	render() {
		let items = [];

		if (this.props.folders.length) {
			const folderItems = shared.renderFolders(this.props, this.folderItem.bind(this));
			items = items.concat(folderItems);
			if (items.length) items.push(this.makeDivider('divider_1'));
		}

		if (this.props.tags.length) {
			const tagItems = shared.renderTags(this.props, this.tagItem.bind(this));

			items.push(<div className="tags" key="tag_items">{tagItems}</div>);

			if (tagItems.length) items.push(this.makeDivider('divider_2'));
		}

		let lines = Synchronizer.reportToLines(this.props.syncReport);
		while (lines.length < 10) lines.push(''); // Add blank lines so that height of report text is fixed and doesn't affect scrolling
		const syncReportText = lines.join("\n");

		items.push(this.synchronizeButton(this.props.syncStarted ? 'cancel' : 'sync'));

		items.push(<div key='sync_report'>{syncReportText}</div>);

		return (
			<div className="side-bar" style={this.props.style}>
				{items}
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		folders: state.folders,
		tags: state.tags,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		notesParentType: state.notesParentType,
		locale: state.settings.locale,
		theme: state.settings.theme,
	};
};

const SideBar = connect(mapStateToProps)(SideBarComponent);

module.exports = { SideBar };