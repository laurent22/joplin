import React from 'react';
import ReactDOM from 'react-dom';
import { render } from 'react-dom'
import { connect } from 'react-redux'
import { createStore } from 'redux';
import immutable from 'object-path-immutable';
import { Provider } from 'react-redux'
import deepcopy from 'deepcopy';

// This is the default state of the application. Each
// application has only one state, which is an object
// with one or more properties.

let defaultState = {
	'myButtonLabel': 'click'
}

// The reducer is what processes the actions of the application, such as
// button clicks, text changes, etc. It takes a state and an action as
// input and must return a state. Important: the state must not be modified
// directly. Create a copy first (see `deepcopy`), modify it and return it.

function reducer(state, action) {
	switch (action.type) {

		case 'SET_BUTTON_NAME':

			var state = deepcopy(state);
			state.myButtonLabel = action.name;
			return state;

	}

	return state;
}

// The store is what essentially links the reducer to the state.

let store = createStore(reducer, defaultState)

// Create the button and input components. Those are regular React components.

class MyButton extends React.Component {

	render() {
		return <button onClick={this.props.onClick}>{this.props.label}</button>
	}

}

class MyInput extends React.Component {

	render() {
		return <input onKeyPress={this.props.onKeyPress} type="text" />
	}

}

// Create the connected components. A connected component (often called "container component")
// is a react component that has been connected to the application state. The connection
// happens by mapping the state properties to the component properties, and by mapping the
// dispatches to the component handlers. This allows better separating the view (React
// component) from the model/controller (state and actions).

const mapStateToButtonProps = function(state) {
	return { label: state.myButtonLabel };
}

const mapDispatchToButtonProps = function(dispatch) {
	return {
		onClick: function() {
			alert('click');
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
		onKeyPress(e) {
			if (e.key == 'Enter') {
				dispatch({
					type: 'SET_BUTTON_NAME',
					name: e.target.value
				});
			}
		}
	}
}

const MyConnectionInput = connect(
	mapStateToInputProps,
	mapDispatchToInputProps
)(MyInput)

// Create the application. Note that we display the Connected components,
// which in turn include the Rect components.

class App extends React.Component {

	render() {
		return (
			<div>
				<MyConnectedButton />
				<MyConnectionInput />
			</div>
		)
	}

}

// Render the application via the <Provider> tag. This is a special React-Redux
// component that "magically" links the store to the application and components.

render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('container')
)