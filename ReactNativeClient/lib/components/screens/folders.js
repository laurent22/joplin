import React, { Component } from 'react';
import { View, Button, Picker, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { FolderList } from 'lib/components/folder-list.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { _ } from 'lib/locale.js';
import { ActionButton } from 'lib/components/action-button.js';

class FoldersScreenComponent extends React.Component {

	static navigationOptions(options) {
		return { header: null };
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<FolderList noItemMessage={_('There is currently no notebook. Create one by clicking on the (+) button.')} style={{flex: 1}}/>
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