import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
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
		this.state = { folder: Folder.new() };
		this.originalFolder = null;
	}

	componentWillMount() {
		if (!this.props.folderId) {
			this.setState({ folder: Folder.new() });
		} else {
			Folder.load(this.props.folderId).then((folder) => {
				this.originalFolder = Object.assign({}, folder);
				this.setState({ folder: folder });
			});
		}
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
		let toSave = {
			title: this.state.folder.title,
		};

		if (this.originalFolder) toSave.id = this.originalFolder.id;

		try {
			let f = await Folder.save(toSave, {
				duplicateCheck: true,
				reservedTitleCheck: true,
			});
			this.originalFolder = f;
		} catch (error) {
			dialogs.error(this, _('The folder could not be saved: %s', error.message));
			return;
		}

		this.setState({ folder: this.originalFolder });

		await NotesScreenUtils.openDefaultNoteList();
	}

	render() {
		// const renderActionButton = () => {
		// 	let buttons = [];

		// 	buttons.push({
		// 		title: _('Save'),
		// 		icon: 'md-checkmark',
		// 		onPress: () => {
		// 			this.saveFolderButton_press();
		// 			return false;
		// 		},
		// 	});

		// 	if (this.state.mode == 'edit' && !this.isModified()) return <ActionButton style={{display:'none'}}/>;

		// 	let toggled = this.state.mode == 'edit';

		// 	return <ActionButton isToggle={true} buttons={buttons} toggled={toggled} />
		// }

		return (
			<View style={this.styles().screen}>
				<ScreenHeader navState={this.props.navigation.state} />
				<TextInput value={this.state.folder.title} onChangeText={(text) => this.title_changeText(text)} />
				<Button title="Save folder" onPress={() => this.saveFolderButton_press()} />
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