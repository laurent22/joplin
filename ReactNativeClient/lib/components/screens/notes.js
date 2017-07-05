import React, { Component } from 'react';
import { View, Button, Picker } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { NoteList } from 'lib/components/note-list.js'
import { Folder } from 'lib/models/folder.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { MenuOption, Text } from 'react-native-popup-menu';
import { _ } from 'lib/locale.js';
import { ActionButton } from 'lib/components/action-button.js';

class NotesScreenComponent extends React.Component {
	
	static navigationOptions(options) {
		return { header: null };
	}

	deleteFolder_onPress(folderId) {
		Folder.delete(folderId).then(() => {
			this.props.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'Folders',
			});
		}).catch((error) => {
			alert(error.message);
		});
	}

	editFolder_onPress(folderId) {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Folder',
			folderId: folderId,
		});
	}

	menuOptions() {
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