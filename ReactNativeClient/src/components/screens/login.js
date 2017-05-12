import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'

class LoginScreenComponent extends React.Component {
	
	static navigationOptions = {
		title: 'Login',
	};

	constructor() {
		super();
		this.state = { username: '', password: '' };
	}

	username_changeText = (text) => {
		this.setState({ username: text });
	}

	password_changeText = (text) => {
		this.setState({ password: text });
	}

	loginButton_press = () => {
		Log.info('LOGIN');
		// Note.save(this.state.note).then((note) => {
		// 	this.props.dispatch({
		// 		type: 'NOTES_UPDATE_ONE',
		// 		note: note,
		// 	});
		// }).catch((error) => {
		// 	Log.warn('Cannot save note', error);
		// });
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<TextInput value={this.state.username} onChangeText={this.username_changeText} />
				<TextInput value={this.state.password} onChangeText={this.password_changeText} />
				<Button title="Login" onPress={this.loginButton_press} />
			</View>
		);
	}

}

const LoginScreen = connect(
	(state) => {
		return {};
	}
)(LoginScreenComponent)

export { LoginScreen };