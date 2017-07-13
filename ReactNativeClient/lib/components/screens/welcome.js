import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { ActionButton } from 'lib/components/action-button.js';
import { _ } from 'lib/locale.js';

class WelcomeScreenComponent extends React.Component {
	
	static navigationOptions(options) {
		return { header: null };
	}

	render() {
		if (this.props.loading) {		
			return (
				<View style={{flex: 1}}>
					<Text>Loading...</Text>
				</View>
			);
		} else {
			let message = this.props.folders.length ? _('Click on the (+) button to create a new note or notebook. Click on the side menu to access your existing notebooks.') : _('You currently have no notebook. Create one by clicking on (+) button.');

			return (
				<View style={{flex: 1}}>
					<ScreenHeader navState={this.props.navigation.state}/>
					<Text>{message}</Text>
					<ActionButton addFolderNoteButtons={true}/>
				</View>
			);			
		}
	}

}

const WelcomeScreen = connect(
	(state) => {
		return {
			loading: state.loading,
			folders: state.folders,
		};
	}
)(WelcomeScreenComponent)

export { WelcomeScreen };