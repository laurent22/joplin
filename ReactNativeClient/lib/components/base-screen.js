import React, { Component } from 'react';
import { StyleSheet } from 'react-native';

const styles_ = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: "#E9E9E9",
	},
});

class BaseScreenComponent extends React.Component {

	styles() {
		return styles_;
	}

}

export { BaseScreenComponent };