import React, { Component } from 'react';
import { View, Button, Picker, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { FolderList } from 'src/components/folder-list.js'
import { ScreenHeader } from 'src/components/screen-header.js';
import { _ } from 'src/locale.js';

class FoldersScreenComponent extends React.Component {

	static navigationOptions = (options) => {
		return { header: null };
	}

	createFolderButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Folder',
			folderId: null,
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<FolderList style={{flex: 1}}/>
				<Button title="Create folder" onPress={this.createFolderButton_press} />
			</View>
		);
	}
}

const FoldersScreen = connect(
	(state) => {
		return {
			folders: state.folders,
		};
	}
)(FoldersScreenComponent)

export { FoldersScreen };