import React, { Component } from 'react';
import { View, Button, Picker, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { FolderList } from 'src/components/folder-list.js'

class FoldersScreenComponent extends React.Component {
	
	static navigationOptions = (options) => {
		return { title: 'Folders' };
		// const nav = options.navigation;
		// Log.info('ici', nav);
		// //return { title: "Folders: " + nav.state.params.listMode };
		// return { title: <Text>Folders: {nav.state.params.listMode}</Text> };
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