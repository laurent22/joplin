import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { ActionButton } from 'lib/components/action-button.js';
import { Folder } from 'lib/models/folder.js'
import { BaseModel } from 'lib/base-model.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { NotesScreenUtils } from 'lib/components/screens/notes-utils.js'
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { dialogs } from 'lib/dialogs.js';
import { _ } from 'lib/locale.js';

class FolderScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			folder: Folder.new(),
			lastSavedFolder: null,
		};
	}

	componentWillMount() {
		if (!this.props.folderId) {
			const folder = Folder.new();
			this.setState({
				folder: folder,
				lastSavedFolder: Object.assign({}, folder),
			});
		} else {
			Folder.load(this.props.folderId).then((folder) => {
				this.setState({
					folder: folder,
					lastSavedFolder: Object.assign({}, folder),
				});
			});
		}
	}

	isModified() {
		if (!this.state.folder || !this.state.lastSavedFolder) return false;
		let diff = BaseModel.diffObjects(this.state.folder, this.state.lastSavedFolder);
		delete diff.type_;
		return !!Object.getOwnPropertyNames(diff).length;
	}

	folderComponent_change(propName, propValue) {
		this.setState((prevState, props) => {
			let folder = Object.assign({}, prevState.folder);
			folder[propName] = propValue;
			return { folder: folder }
		});
	}

	title_changeText(text) {
		this.folderComponent_change('title', text);
	}

	async saveFolderButton_press() {
		let folder = Object.assign({}, this.state.folder);

		try {
			folder = await Folder.save(folder, {
				duplicateCheck: true,
				reservedTitleCheck: true,
			});
		} catch (error) {
			dialogs.error(this, _('The folder could not be saved: %s', error.message));
			return;
		}

		this.setState({
			lastSavedFolder: Object.assign({}, folder),
			folder: folder,
		});

		await NotesScreenUtils.openNoteList(folder.id);
	}

	render() {
		const renderActionButton = () => {
			let buttons = [];

			buttons.push({
				title: _('Save'),
				icon: 'md-checkmark',
				onPress: () => {
					this.saveFolderButton_press()
				},
			});

			if (!this.isModified()) return <ActionButton style={{display:'none'}}/>;

			let buttonIndex = this.state.mode == 'view' ? 0 : 1;

			return <ActionButton multiStates={true} buttons={buttons} buttonIndex={0} />
		}

		const actionButtonComp = renderActionButton();

		return (
			<View style={this.styles().screen}>
				<ScreenHeader navState={this.props.navigation.state} />
				<TextInput autoFocus={true} value={this.state.folder.title} onChangeText={(text) => this.title_changeText(text)} />
				{ actionButtonComp }
				<dialogs.DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}

}

const FolderScreen = connect(
	(state) => {
		return {
			folderId: state.selectedFolderId,
		};
	}
)(FolderScreenComponent)

export { FolderScreen };