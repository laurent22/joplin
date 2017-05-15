import React, { Component } from 'react';
import { View, Button, Picker } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { FolderList } from 'src/components/folder-list.js'

class FoldersScreenComponent extends React.Component {
	
	static navigationOptions = {
		title: 'Folders',
	};

	createFolderButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Folder',
		});
	}

	render() {
		const { navigate } = this.props.navigation;
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
			folders: state.folders
		};
	}
)(FoldersScreenComponent)

export { FoldersScreen };