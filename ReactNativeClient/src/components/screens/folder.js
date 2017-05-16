import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { Folder } from 'src/models/folder.js'
import { ScreenHeader } from 'src/components/screen-header.js';

class FolderScreenComponent extends React.Component {
	
	static navigationOptions = (options) => {
		return { header: null };
	}

	constructor() {
		super();
		this.state = { folder: Folder.newFolder() }
	}

	componentWillMount() {
		this.setState({ folder: this.props.folder });
	}

	folderComponent_change = (propName, propValue) => {
		this.setState((prevState, props) => {
			let folder = Object.assign({}, prevState.folder);
			folder[propName] = propValue;
			return { folder: folder }
		});
	}

	title_changeText = (text) => {
		this.folderComponent_change('title', text);
	}

	saveFolderButton_press = () => {
		Folder.save(this.state.folder).then((folder) => {
			this.props.dispatch({
				type: 'FOLDERS_UPDATE_ONE',
				folder: folder,
			});
		}).catch((error) => {
			Log.warn('Cannot save folder', error);
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<TextInput value={this.state.folder.title} onChangeText={this.title_changeText} />
				<Button title="Save folder" onPress={this.saveFolderButton_press} />
			</View>
		);
	}

}

const FolderScreen = connect(
	(state) => {
		return {
			folder: state.selectedFolderId ? Folder.byId(state.folders, state.selectedFolderId) : Folder.newFolder(),
		};
	}
)(FolderScreenComponent)

export { FolderScreen };