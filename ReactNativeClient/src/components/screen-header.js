import React, { Component } from 'react';
import { connect } from 'react-redux'
import { View, Text, Button } from 'react-native';
import { Log } from 'src/log.js';
import { _ } from 'src/locale.js';

class ScreenHeaderComponent extends Component {

	showBackButton() {
		// Note: this is hardcoded for now because navigation.state doesn't tell whether
		// it's possible to go back or not. Maybe it's possible to get this information
		// from somewhere else.
		return this.props.navState.routeName != 'Folders';
	}

	backButton_press = () => {
		this.props.dispatch({ type: 'Navigation/BACK' });
	}

	render() {
		return (
			<View style={{ flexDirection: 'row', padding: 10, backgroundColor: '#ffffff', alignItems: 'center' }} >
				<Button disabled={!this.showBackButton()} title="<" onPress={this.backButton_press}></Button>
				<Text style={{ marginLeft: 10 }} >{_(this.props.navState.routeName)}</Text>
			</View>
		);
	}

}

const ScreenHeader = connect(
	(state) => {
		return {};
	}
)(ScreenHeaderComponent)

export { ScreenHeader };