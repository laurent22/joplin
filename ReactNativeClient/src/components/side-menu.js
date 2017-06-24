import React, { Component } from 'react';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js';
import SideMenu_ from 'react-native-side-menu';

class SideMenuComponent extends SideMenu_ {};

const SideMenu = connect(
	(state) => {
		return {
			isOpen: state.showSideMenu,
		};
	}
)(SideMenuComponent)

export { SideMenu };