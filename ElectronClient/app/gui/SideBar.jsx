const React = require('react');
const { connect } = require('react-redux');
const shared = require('lib/components/shared/side-menu-shared.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { themeStyle } = require('../theme.js');

class SideBarComponent extends React.Component {

	style() {
		const theme = themeStyle(this.props.theme);

		const itemHeight = 20;

		let style = {
			root: {},
			listItem: {
				display: 'block',
				cursor: 'pointer',
				height: itemHeight,
			},
		};

		return style;
	}

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

	async sync_click() {
		await shared.synchronize_press(this);
	}

	folderItem(folder, selected) {
		const style = Object.assign({}, this.style().listItem, {
			fontWeight: selected ? 'bold' : 'normal',
		});
		return <a href="#" key={folder.id} style={style} onClick={() => {this.folderItem_click(folder)}}>{folder.title}</a>
	}

	tagItem(tag, selected) {
		const style = Object.assign({}, this.style().listItem, {
			fontWeight: selected ? 'bold' : 'normal',
		});
		return <a href="#" key={tag.id} style={style} onClick={() => {this.tagItem_click(tag)}}>Tag: {tag.title}</a>
	}

	makeDivider(key) {
		return <div style={{height:2, backgroundColor:'blue' }} key={key}></div>
	}

	synchronizeButton(label) {
		return <a href="#" key="sync_button" onClick={() => {this.sync_click()}}>{label}</a>
	}

	render() {
		const theme = themeStyle(this.props.theme);
		const style = Object.assign({}, this.style().root, this.props.style);

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
			<div className="side-bar" style={style}>
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