import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { ActionButton } from 'lib/components/action-button.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { _ } from 'lib/locale.js';
import { globalStyle } from 'lib/components/global-style.js';

const styles = StyleSheet.create({
	message: {
		margin: globalStyle.margin,
		fontSize: globalStyle.fontSize,
	},
});

class WelcomeScreenComponent extends BaseScreenComponent {
	
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
				<View style={this.styles().screen} >
					<ScreenHeader title={_('Welcome')}/>
					<Text style={styles.message}>{message}</Text>
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