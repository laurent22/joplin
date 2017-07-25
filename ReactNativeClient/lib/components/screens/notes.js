import React, { Component } from 'react';
import { View, Button, Picker } from 'react-native';
import { connect } from 'react-redux'
import { reg } from 'lib/registry.js';
import { Log } from 'lib/log.js'
import { NoteList } from 'lib/components/note-list.js'
import { Folder } from 'lib/models/folder.js'
import { Note } from 'lib/models/note.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { MenuOption, Text } from 'react-native-popup-menu';
import { _ } from 'lib/locale.js';
import { ActionButton } from 'lib/components/action-button.js';
import { dialogs } from 'lib/dialogs.js';
import DialogBox from 'react-native-dialogbox';
import { BaseScreenComponent } from 'lib/components/base-screen.js';

class NotesScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	async componentDidMount() {
		await this.refreshNotes();
	}

	async componentWillReceiveProps(newProps) {
		if (newProps.notesOrder.orderBy != this.props.notesOrder.orderBy ||
		    newProps.notesOrder.orderByDir != this.props.notesOrder.orderByDir ||
		    newProps.selectedFolderId != this.props.selectedFolderId) {
			await this.refreshNotes(newProps);
		}
	}

	async refreshNotes(props = null) {
		if (props === null) props = this.props;

		let options = {
			orderBy: props.notesOrder.orderBy,
			orderByDir: props.notesOrder.orderByDir,
		};

		const source = JSON.stringify({
			options: options,
			selectedFolderId: props.selectedFolderId,
		});

		let folder = Folder.byId(props.folders, props.selectedFolderId);

		if (source == props.notesSource) return;

		const notes = await Note.previews(props.selectedFolderId, options);

		this.props.dispatch({
			type: 'NOTES_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	deleteFolder_onPress(folderId) {
		dialogs.confirm(this, _('Delete notebook?')).then((ok) => {
			if (!ok) return;

			Folder.delete(folderId).then(() => {
				this.props.dispatch({
					type: 'Navigation/NAVIGATE',
					routeName: 'Welcome',
				});

				reg.scheduleSync();
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
			return (
				<View style={this.styles().screen}>
					<ScreenHeader title={title} menuOptions={this.menuOptions()} />
				</View>
			)
		}

		let title = folder ? folder.title : null;
		const addFolderNoteButtons = folder.id != Folder.conflictFolderId();

		const { navigate } = this.props.navigation;
		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={title} menuOptions={this.menuOptions()} />
				<NoteList style={{flex: 1}}/>
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
			notes: state.notes,
			notesOrder: state.notesOrder,
			notesSource: state.notesSource,
		};
	}
)(NotesScreenComponent)

export { NotesScreen };