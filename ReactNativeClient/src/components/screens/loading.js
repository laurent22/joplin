import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { Folder } from 'src/models/folder.js'
import { ScreenHeader } from 'src/components/screen-header.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';

class LoadingScreenComponent extends React.Component {
	
	static navigationOptions = (options) => {
		return { header: null };
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<Text>Loading...</Text>
			</View>
		);
	}

}

const LoadingScreen = connect(
	(state) => {
		return {};
	}
)(LoadingScreenComponent)

export { LoadingScreen };