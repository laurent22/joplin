import React, { Component } from 'react';
import { connect } from 'react-redux'
import { View } from 'react-native';
import { _ } from 'lib/locale.js';

class AppNavComponent extends Component {

	constructor() {
		super();
		this.screenCache_ = [];
	}

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		let route = this.props.route;
		let Screen = this.props.screens[route.routeName].screen;

		return (
			<View style={{flex:1}}>
				<Screen style={{backgroundColor: '#f00'}} navigation={{ state: route }} />
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