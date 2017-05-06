import React, { Component } from 'react';
import { AppRegistry, View, Button, TextInput } from 'react-native';

import { connect } from 'react-redux'
import { createStore } from 'redux';
import { Provider } from 'react-redux'

let defaultState = {
	'myButtonLabel': 'clicko123456',
	'counter': 0,
}

function shallowcopy(a) {
	return Object.assign({}, a);
}

let store = createStore(reducer, defaultState);

function reducer(state, action) {
	switch (action.type) {

		case 'SET_BUTTON_NAME':

			var state = shallowcopy(state);
			state.myButtonLabel = action.name;
			return state;

		case 'INC_COUNTER':

			var state = shallowcopy(state);
			state.counter++;
			return state;

	}

	return state;
}

class MyButton extends Component {

	render() {
		var label = this.props.label;
		if (label === undefined) label = '';
		return <Button onPress={this.props.onPress} title={label} />
	}

}

class MyInput extends Component {

	render() {
		return <TextInput onChangeText={this.props.onChangeText} />
	}

}

const mapStateToButtonProps = function(state) {
	return { label: state.myButtonLabel };
}

const mapDispatchToButtonProps = function(dispatch) {
	return {
		onPress: function() {
			dispatch({
				type: 'INC_COUNTER'
			});
		}
	}
}

const MyConnectedButton = connect(
	mapStateToButtonProps,
	mapDispatchToButtonProps
)(MyButton)

const mapStateToInputProps = function(state) {
	return {}
}

const mapDispatchToInputProps = function(dispatch) {
	return {
		onChangeText(text) {
			dispatch({
				type: 'SET_BUTTON_NAME',
				name: text
			});
		}
	}
}

const MyConnectionInput = connect(
	mapStateToInputProps,
	mapDispatchToInputProps
)(MyInput)

class App extends Component {

	render() {
		return (
			<Provider store={store}>
				<View>
					<MyConnectedButton />
					<MyConnectionInput />
				</View>
			</Provider>
		)
	}

}

const queryString = require('query-string');

class Api {

	constructor(baseUrl, clientId) {
		this.baseUrl_ = baseUrl;
		this.clientId_ = clientId;
	}

	makeRequest(method, path, query, data) {
		let url = this.baseUrl_;
		if (path) url += '/' + path;
		if (query) url += '?' + queryString(query);
		let options = {};
		options.method = method.toUpperCase();
		if (data) {
			var formData = new FormData();
			for (var key in data) {
				if (!data.hasOwnProperty(key)) continue;
				formData.append(key, data[key]);
			}
			options.body = formData;
		}

		return {
			url: url,
			options: options
		};
	}

	exec(method, path, query, data) {
		let that = this;
		return new Promise(function(resolve, reject) {
			let r = that.makeRequest(method, path, query, data);

			fetch(r.url, r.options)
			.then(function(response) {
				let responseClone = response.clone();
				return response.json()
				.then(function(data) {
					resolve(data);
				})
				.catch(function(error) {
					responseClone.text()
					.done(function(text) {
						reject('Cannot parse JSON: ' + text);
					});
				});
			})
			.then(function(data) {
				resolve(data);
			})
			.catch(function(error) {
				reject(error);
			});
		});
	}

	get(path, query) {
		return this.exec('GET', path, query);
	}

	post(path, query, data) {
		return this.exec('POST', path, query, data);
	}

	delete(path, query) {
		return this.exec('DELETE', path, query);
	}

}

let api = new Api('http://192.168.1.2', 'A7D301DA7D301DA7D301DA7D301DA7D3');
api.exec('POST', 'sessions', null, {
	'email': 'laurent@cozic.net',
	'password': '12345678',
})
.then(function(data) {
	console.info('GOT DATA:');
	console.info(data);
})
.catch(function(error) {
	console.warn('GOT ERROR:');
	console.warn(error);
})

AppRegistry.registerComponent('AwesomeProject', () => App);