import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { Folder } from 'lib/models/folder.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { NoteFolderService } from 'lib/services/note-folder-service.js';

class LoadingScreenComponent extends React.Component {
	
	static navigationOptions(options) {
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