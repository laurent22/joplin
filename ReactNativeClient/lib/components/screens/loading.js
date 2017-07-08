import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { ActionButton } from 'lib/components/action-button.js';

class LoadingScreenComponent extends React.Component {
	
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
			return (
				<View style={{flex: 1}}>
					<ScreenHeader navState={this.props.navigation.state} />
					<Text>You currently have no notebook. Create one by clicking on (+) button.</Text>
					<ActionButton></ActionButton>
				</View>
			);			
		}
	}

}

const LoadingScreen = connect(
	(state) => {
		return {
			loading: state.loading,
		};
	}
)(LoadingScreenComponent)

export { LoadingScreen };