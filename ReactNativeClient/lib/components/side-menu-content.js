import React, { Component } from 'react';
import { TouchableOpacity , Button, Text, Image, StyleSheet, ScrollView, View } from 'react-native';
import { connect } from 'react-redux'
import Icon from 'react-native-vector-icons/Ionicons';
import { Log } from 'lib/log.js';
import { Note } from 'lib/models/note.js';
import { FoldersScreenUtils } from 'lib/components/screens/folders-utils.js'
import { NotesScreenUtils } from 'lib/components/screens/notes-utils.js'
import { Synchronizer } from 'lib/synchronizer.js';
import { reg } from 'lib/registry.js';
import { _ } from 'lib/locale.js';
import { globalStyle } from 'lib/components/global-style.js';

const styleObject = {
	menu: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
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
};

styleObject.folderButton = Object.assign({}, styleObject.button);
styleObject.folderButtonText = Object.assign({}, styleObject.buttonText);
styleObject.folderIcon = Object.assign({}, globalStyle.icon);
styleObject.folderIcon.color = '#0072d5';
styleObject.syncButton = Object.assign({}, styleObject.button);
styleObject.syncButtonText = Object.assign({}, styleObject.buttonText);
styleObject.folderButtonSelected = Object.assign({}, styleObject.folderButton);
styleObject.folderButtonSelected.backgroundColor = globalStyle.selectedColor;

const styles = StyleSheet.create(styleObject);

class SideMenuContentComponent extends Component {

	constructor() {
		super();
		this.state = { syncReportText: '' };
	}

	folder_press(folder) {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		NotesScreenUtils.openNoteList(folder.id);
	}

	async synchronize_press() {
		const sync = await reg.synchronizer()

		if (this.props.syncStarted) {
			sync.cancel();
		} else {
			if (reg.oneDriveApi().auth()) {		
				reg.scheduleSync(1);
			} else {
				this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
				
				this.props.dispatch({
					type: 'Navigation/NAVIGATE',
					routeName: 'OneDriveLogin',
				});
			}
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

	synchronizeButton(state) {
		const title = state == 'sync' ? _('Synchronize') : _('Cancel synchronization');
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

	render() {
		let items = [];

		// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
		// using padding. So instead creating blank elements for padding bottom and top.
		items.push(<View style={{ height: globalStyle.marginTop }} key='bottom_top_hack'/>);

		for (let i = 0; i < this.props.folders.length; i++) {
			let folder = this.props.folders[i];
			items.push(this.folderItem(folder, this.props.selectedFolderId == folder.id));
		}

		if (items.length) items.push(<View style={{ height: 30, flex: -1 }} key='divider_1'></View>); // DIVIDER

		const syncTitle = this.props.syncStarted ? _('Cancel sync') : _('Synchronize');

		let lines = Synchronizer.reportToLines(this.props.syncReport);
		const syncReportText = lines.join("\n");

		items.push(this.synchronizeButton(this.props.syncStarted ? 'cancel' : 'sync'));

		items.push(<Text key='sync_report' style={styles.syncStatus}>{syncReportText}</Text>);

		items.push(<View style={{ height: globalStyle.marginBottom }} key='bottom_padding_hack'/>);

		return (
			<View style={{flex:1}}>
				<View style={{flexDirection:'row'}}>
					<Image style={{flex:1, height: 150}} source={require('../images/SideMenuHeader.png')} />
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
			syncStarted: state.syncStarted,
			syncReport: state.syncReport,
			selectedFolderId: state.selectedFolderId,
		};
	}
)(SideMenuContentComponent)

export { SideMenuContent };