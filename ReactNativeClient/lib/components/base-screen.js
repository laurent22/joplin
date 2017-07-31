import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import { globalStyle } from 'lib/components/global-style.js';

const styleObject_ = {
	screen: {
		flex: 1,
		backgroundColor: globalStyle.backgroundColor,
	},
};

const styles_ = StyleSheet.create(styleObject_);

class BaseScreenComponent extends React.Component {

	styles() {
		return styles_;
	}

	styleObject() {
		return styleObject_;
	}

}

export { BaseScreenComponent };