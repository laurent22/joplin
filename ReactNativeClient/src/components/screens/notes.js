import React, { Component } from 'react';
import { View, Button } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { ItemList } from 'src/components/item-list.js'

class NotesScreenComponent extends React.Component {
	
	static navigationOptions = {
		title: 'Notes',
	};

	createNoteButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
		});
	}

	loginButton_press = () => {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Login',
		});
	}

	syncButton_press = () => {
		Log.info('SYNC');
	}

	render() {
		const { navigate } = this.props.navigation;
		return (
			<View style={{flex: 1}}>
				<ItemList style={{flex: 1}}/>
				<View style={{flexDirection: 'row'}}>
					<Button title="Create note" onPress={this.createNoteButton_press} />
					<Button title="Login" onPress={this.loginButton_press} />
					<Button title="Sync" onPress={this.syncButton_press} />
				</View>
			</View>
		);
	}
}

const NotesScreen = connect(
	(state) => {
		return {};
	}
)(NotesScreenComponent)

export { NotesScreen };