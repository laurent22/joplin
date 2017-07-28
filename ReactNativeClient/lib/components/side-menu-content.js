import React, { Component } from 'react';
import { TouchableOpacity , Button, Text, Image, StyleSheet, ScrollView, View } from 'react-native';
import { connect } from 'react-redux'
import Icon from 'react-native-vector-icons/Ionicons';
import { Log } from 'lib/log.js';
import { Tag } from 'lib/models/tag.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { FoldersScreenUtils } from 'lib/components/screens/folders-utils.js'
import { Synchronizer } from 'lib/synchronizer.js';
import { reg } from 'lib/registry.js';
import { _ } from 'lib/locale.js';
import { globalStyle } from 'lib/components/global-style.js';

let styles = {
	menu: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
		borderTopWidth: 1,
		borderTopColor: globalStyle.dividerColor,
	},
	name: {
		position: 'absolute',
		left: 70,
		top: 20,
	},
	item: {
		fontSize: 14,
		fontWeight: '300',
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		height: 36,
		alignItems: 'center',
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
	},
	buttonText: {
		flex: 1,
		color: globalStyle.color,
		paddingLeft: 10,
	},
	syncStatus: {
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		color: globalStyle.colorFaded,
	},
	tagItemList: {
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap'
	},
};

styles.folderButton = Object.assign({}, styles.button);
styles.folderButtonText = Object.assign({}, styles.buttonText);
styles.folderButtonSelected = Object.assign({}, styles.folderButton);
styles.folderButtonSelected.backgroundColor = globalStyle.selectedColor;
styles.folderIcon = Object.assign({}, globalStyle.icon);
styles.folderIcon.color = '#0072d5';

styles.tagButton = Object.assign({}, styles.button);
styles.tagButtonSelected = Object.assign({}, styles.tagButton);
styles.tagButtonSelected.backgroundColor = globalStyle.selectedColor;
styles.tagButtonSelected.borderRadius = 1000;
styles.tagButtonText = Object.assign({}, styles.buttonText);
styles.tagButtonText.flex = 0;

styles.syncButton = Object.assign({}, styles.button);
styles.syncButtonText = Object.assign({}, styles.buttonText);

styles = StyleSheet.create(styles);

class SideMenuContentComponent extends Component {

	constructor() {
		super();
		this.state = { syncReportText: '',
			//width: 0,
		};
	}

	folder_press(folder) {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	}

	tag_press(tag) {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			tagId: tag.id,
		});
	}

	async synchronize_press() {
		if (Setting.value('sync.target') == Setting.SYNC_TARGET_ONEDRIVE && !reg.oneDriveApi().auth()) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'OneDriveLogin',
			});
			return;
		}

		const sync = await reg.synchronizer(Setting.value('sync.target'))

		if (this.props.syncStarted) {
			sync.cancel();
		} else {
			reg.scheduleSync(0);
		}
	}

	folderItem(folder, selected) {
		const iconComp = selected ? <Icon name='md-folder-open' style={styles.folderIcon} /> : <Icon name='md-folder' style={styles.folderIcon} />;
		const folderButtonStyle = selected ? styles.folderButtonSelected : styles.folderButton;

		return (
			<TouchableOpacity key={folder.id} onPress={() => { this.folder_press(folder) }}>
				<View style={folderButtonStyle}>
					{ iconComp }
					<Text numberOfLines={1} style={styles.folderButtonText}>{folder.title}</Text>
				</View>
			</TouchableOpacity>
		);
	}

	tagItem(tag, selected) {
		const iconComp = <Icon name='md-pricetag' style={styles.folderIcon} />
		const tagButtonStyle = selected ? styles.tagButtonSelected : styles.tagButton;

		return (
			<TouchableOpacity key={tag.id} onPress={() => { this.tag_press(tag) }}>
				<View style={tagButtonStyle}>
					{ iconComp }
					<Text numberOfLines={1} style={styles.tagButtonText}>{tag.title}</Text>
				</View>
			</TouchableOpacity>
		);
	}

	synchronizeButton(state) {
		const title = state == 'sync' ? _('Synchronise') : _('Cancel synchronisation');
		const iconComp = state == 'sync' ? <Icon name='md-sync' style={globalStyle.icon} /> : <Icon name='md-close' style={globalStyle.icon} />;

		return (
			<TouchableOpacity key={'synchronize_button'} onPress={() => { this.synchronize_press() }}>
				<View style={styles.syncButton}>
					{ iconComp }
					<Text style={styles.syncButtonText}>{title}</Text>
				</View>
			</TouchableOpacity>
		);
	}

	makeDivider(key) {
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: globalStyle.dividerColor }} key={key}></View>
	}

	render() {
		let items = [];

		// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
		// using padding. So instead creating blank elements for padding bottom and top.
		items.push(<View style={{ height: globalStyle.marginTop }} key='bottom_top_hack'/>);

		if (this.props.folders.length) {
			for (let i = 0; i < this.props.folders.length; i++) {
				let folder = this.props.folders[i];
				items.push(this.folderItem(folder, this.props.selectedFolderId == folder.id && this.props.notesParentType == 'Folder'));
			}

			if (items.length) items.push(this.makeDivider('divider_1'));
		}

		if (this.props.tags.length) {
			let tagItems = [];
			for (let i = 0; i < this.props.tags.length; i++) {
				const tag = this.props.tags[i];
				tagItems.push(this.tagItem(tag, this.props.selectedTagId == tag.id && this.props.notesParentType == 'Tag'));
			}

			items.push(
				<View style={styles.tagItemList} key="tag_items">
					{tagItems}
				</View>
			);

			if (tagItems.length) items.push(this.makeDivider('divider_2'));
		}

		let lines = Synchronizer.reportToLines(this.props.syncReport);
		while (lines.length < 10) lines.push(''); // Add blank lines so that height of report text is fixed and doesn't affect scrolling
		const syncReportText = lines.join("\n");

		items.push(this.synchronizeButton(this.props.syncStarted ? 'cancel' : 'sync'));

		items.push(<Text key='sync_report' style={styles.syncStatus}>{syncReportText}</Text>);

		items.push(<View style={{ height: globalStyle.marginBottom }} key='bottom_padding_hack'/>);

		return (
			<View style={{flex:1, borderRightWidth: 1, borderRightColor: globalStyle.dividerColor }}>
				<View style={{flexDirection:'row'}}>
					<Image style={{flex:1, height: 100}} source={require('../images/SideMenuHeader.png')} />
				</View>
				<ScrollView scrollsToTop={false} style={styles.menu}>
					{ items }
				</ScrollView>
			</View>
		);
	}
};

const SideMenuContent = connect(
	(state) => {
		return {
			folders: state.folders,
			tags: state.tags,
			syncStarted: state.syncStarted,
			syncReport: state.syncReport,
			selectedFolderId: state.selectedFolderId,
			selectedTagId: state.selectedTagId,
			notesParentType: state.notesParentType,
			locale: state.settings.locale,
		};
	}
)(SideMenuContentComponent)

export { SideMenuContent };