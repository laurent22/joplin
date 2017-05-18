import React, { Component } from 'react';
import { View, Button, Picker } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { NoteList } from 'src/components/note-list.js'
import { Folder } from 'src/models/folder.js'
import { ScreenHeader } from 'src/components/screen-header.js';
import { MenuOption, Text } from 'react-native-popup-menu';
import { _ } from 'src/locale.js';
import { ActionButton } from 'src/components/action-button.js';

class NotesScreenComponent extends React.Component {
	
	static navigationOptions = (options) => {
		return { header: null };
	}

	createNoteButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
		});
	}

	createFolderButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Folder',
		});
	}

	deleteFolder_onPress = (folderId) => {
		Folder.delete(folderId).then(() => {
			this.props.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'Folders',
			});
		});
	}

	editFolder_onPress = (folderId) => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Folder',
			folderId: folderId,
		});
	}

	menuOptions = () => {
		return [
			{ title: _('Delete folder'), onPress: () => { this.deleteFolder_onPress(this.props.selectedFolderId); } },
			{ title: _('Edit folder'), onPress: () => { this.editFolder_onPress(this.props.selectedFolderId); } },
		];
	}

	render() {
		let folder = Folder.byId(this.props.folders, this.props.selectedFolderId);
		let title = folder ? folder.title : null;

		const { navigate } = this.props.navigation;
		return (
			<View style={{flex: 1}}>
				<ScreenHeader title={title} navState={this.props.navigation.state} menuOptions={this.menuOptions()} />
				<NoteList style={{flex: 1}}/>
				<ActionButton parentFolderId={this.props.selectedFolderId}></ActionButton>
			</View>
		);
	}
}

const NotesScreen = connect(
	(state) => {
		return {
			folders: state.folders,
			selectedFolderId: state.selectedFolderId,
		};
	}
)(NotesScreenComponent)

export { NotesScreen };