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
import { dialogs } from 'lib/dialogs.js';
import { NotesScreenUtils } from 'lib/components/screens/notes-utils.js'
import DialogBox from 'react-native-dialogbox';
import { BaseScreenComponent } from 'lib/components/base-screen.js';

class NotesScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	deleteFolder_onPress(folderId) {
		dialogs.confirm(this, _('Delete notebook?')).then((ok) => {
			if (!ok) return;

			Folder.delete(folderId).then(() => {
				return NotesScreenUtils.openDefaultNoteList();
			}).catch((error) => {
				alert(error.message);
			});
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
		if (this.props.selectedFolderId == Folder.conflictFolderId()) return [];
		
		return [
			{ title: _('Delete notebook'), onPress: () => { this.deleteFolder_onPress(this.props.selectedFolderId); } },
			{ title: _('Edit notebook'), onPress: () => { this.editFolder_onPress(this.props.selectedFolderId); } },
		];
	}

	render() {
		let folder = Folder.byId(this.props.folders, this.props.selectedFolderId);

		if (!folder) {
			NotesScreenUtils.openDefaultNoteList();
			return null;
		}

		let title = folder ? folder.title : null;
		const addFolderNoteButtons = folder.id != Folder.conflictFolderId();

		const { navigate } = this.props.navigation;
		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={title} navState={this.props.navigation.state} menuOptions={this.menuOptions()} />
				<NoteList noItemMessage={_('There are currently no notes. Create one by clicking on the (+) button.')} style={{flex: 1}}/>
				<ActionButton addFolderNoteButtons={addFolderNoteButtons} parentFolderId={this.props.selectedFolderId}></ActionButton>
				<DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
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