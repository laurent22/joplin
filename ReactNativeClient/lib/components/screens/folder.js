import React, { Component } from 'react';
import { View, Button, TextInput, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { ActionButton } from 'lib/components/action-button.js';
import { Folder } from 'lib/models/folder.js'
import { BaseModel } from 'lib/base-model.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { reg } from 'lib/registry.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { dialogs } from 'lib/dialogs.js';
import { themeStyle } from 'lib/components/global-style.js';
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
		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
			textInput: {
				color: theme.color,
			},
		};

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
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
			folder = await Folder.save(folder, { userSideValidation: true });
		} catch (error) {
			dialogs.error(this, _('The notebook could not be saved: %s', error.message));
			return;
		}

		this.setState({
			lastSavedFolder: Object.assign({}, folder),
			folder: folder,
		});

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	}

	render() {
		let saveButtonDisabled = !this.isModified();

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader
					title={_('Edit notebook')}
					showSaveButton={true}
					saveButtonDisabled={saveButtonDisabled}
					onSaveButtonPress={() => this.saveFolderButton_press()}
				/>
				<TextInput style={this.styles().textInput} autoFocus={true} value={this.state.folder.title} onChangeText={(text) => this.title_changeText(text)} />
				<dialogs.DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}

}

const FolderScreen = connect(
	(state) => {
		return {
			folderId: state.selectedFolderId,
			theme: state.settings.theme,
		};
	}
)(FolderScreenComponent)

export { FolderScreen };