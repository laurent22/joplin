import React, { Component } from 'react';
import { connect } from 'react-redux'
import { NotesScreen } from 'lib/components/screens/notes.js';
import { View } from 'react-native';
import { _ } from 'lib/locale.js';

class AppNavComponent extends Component {

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		let route = this.props.route;
		let Screen = null;
		let notesScreenVisible = false;

		if (route.routeName == 'Notes') {
			notesScreenVisible = true;
		} else {
			Screen = this.props.screens[route.routeName].screen;
		}

		return (
			<View style={{ flex: 1 }}>
				<NotesScreen visible={notesScreenVisible} navigation={{ state: route }} />
				{ !notesScreenVisible && <Screen navigation={{ state: route }} /> }
			</View>
		);
	}

}

const AppNav = connect(
	(state) => {
		return {
			route: state.route,
		};
	}
)(AppNavComponent)

export { AppNav };