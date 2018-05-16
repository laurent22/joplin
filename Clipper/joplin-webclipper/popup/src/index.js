import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const { connect, Provider } = require('react-redux');
const { bridge } = require('./bridge');
const { createStore } = require('redux');

const defaultState = {
	warning: '',
	pageTitle: '',
};

function reducer(state = defaultState, action) {
	let newState = state;

	if (action.type === 'WARNING_SET') {

		newState = Object.assign({}, state);
		newState.warning = action.text;

	} else if (action.type === 'PAGE_TITLE_SET') {

		newState = Object.assign({}, state);
		newState.pageTitle = action.text;

	}

	return newState;
}

const store = createStore(reducer);

bridge().init(window.browser, store.dispatch);

console.info('Popup: Creating React app...');

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
