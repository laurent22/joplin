import React, { Component } from 'react';
import { View, Button, Picker, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { FolderList } from 'src/components/folder-list.js'
import { ScreenHeader } from 'src/components/screen-header.js';
import { _ } from 'src/locale.js';
import { ActionButton } from 'src/components/action-button.js';

class FoldersScreenComponent extends React.Component {

	static navigationOptions(options) {
		return { header: null };
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<FolderList style={{flex: 1}}/>
				<ActionButton></ActionButton>
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