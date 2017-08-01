import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { ActionButton } from 'lib/components/action-button.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { _ } from 'lib/locale.js';
import { themeStyle } from 'lib/components/global-style.js';

class WelcomeScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.styles_ = {};
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			message: {
				margin: theme.margin,
				fontSize: theme.fontSize,
				color: theme.color,
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	render() {
		let message = this.props.folders.length ? _('Click on the (+) button to create a new note or notebook. Click on the side menu to access your existing notebooks.') : _('You currently have no notebook. Create one by clicking on (+) button.');

		return (
			<View style={this.rootStyle(this.props.theme).root} >
				<ScreenHeader title={_('Welcome')}/>
				<Text style={this.styles().message}>{message}</Text>
				<ActionButton addFolderNoteButtons={true}/>
			</View>
		);
	}

}

const WelcomeScreen = connect(
	(state) => {
		return {
			folders: state.folders,
			theme: state.settings.theme,
		};
	}
)(WelcomeScreenComponent)

export { WelcomeScreen };