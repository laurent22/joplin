import React, { Component } from 'react';
import { View, Button, TextInput, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { Registry } from 'src/registry.js';
import { Setting } from 'src/models/setting.js';
import { ScreenHeader } from 'src/components/screen-header.js';
import { _ } from 'src/locale.js';

class LoginScreenComponent extends React.Component {
	
	static navigationOptions = (options) => {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			email: '',
			password: '',
			errorMessage: null,
		};
	}

	email_changeText = (text) => {
		this.setState({ email: text });
	}

	password_changeText = (text) => {
		this.setState({ password: text });
	}

	loginButton_press = () => {
		this.setState({ errorMessage: null });

		return Registry.api().post('sessions', null, {
			'email': this.state.email,
			'password': this.state.password,
			'client_id': Setting.value('clientId'),
		}).then((session) => {
			Log.info('GOT DATA:');
			Log.info(session);
		}).catch((error) => {
			this.setState({ errorMessage: _('Could not login: %s)', error.message) });
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<TextInput value={this.state.email} onChangeText={this.email_changeText} keyboardType="email-address" />
				<TextInput value={this.state.password} onChangeText={this.password_changeText} secureTextEntry={true} />
				{ this.state.errorMessage && <Text style={{color:'#ff0000'}}>{this.state.errorMessage}</Text> }
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