import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { Folder } from 'src/models/folder.js'
import { ScreenHeader } from 'src/components/screen-header.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';

class FolderScreenComponent extends React.Component {
	
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

	saveFolderButton_press() {
		NoteFolderService.save('folder', this.state.folder, this.originalFolder).then((folder) => {
			this.originalFolder = Object.assign({}, folder);
			this.setState({ folder: folder });
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<TextInput value={this.state.folder.title} onChangeText={(text) => this.title_changeText(text)} />
				<Button title="Save folder" onPress={() => this.saveFolderButton_press()} />
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