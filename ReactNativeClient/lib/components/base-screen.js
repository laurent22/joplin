import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import { globalStyle } from 'lib/components/global-style.js';

const styles_ = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
	},
});

class BaseScreenComponent extends React.Component {

	styles() {
		return styles_;
	}

}

export { BaseScreenComponent };