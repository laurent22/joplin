import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const { Provider } = require('react-redux');
const { bridge } = require('./bridge');
const { createStore } = require('redux');

const defaultState = {
	warning: '',
	clippedContent: null,
	contentUploadOperation: null,
};

function reducer(state = defaultState, action) {
	let newState = state;

	if (action.type === 'WARNING_SET') {

		newState = Object.assign({}, state);
		newState.warning = action.text;

	} else if (action.type === 'CLIPPED_CONTENT_SET') {

		newState = Object.assign({}, state);
		newState.clippedContent = action.content;

	} else if (action.type === 'CLIPPED_CONTENT_TITLE_SET') {

		newState = Object.assign({}, state);
		const newContent = newState.clippedContent ? Object.assign({}, newState.clippedContent) : {};
		newContent.title = action.text;
		newState.clippedContent = newContent;

	} else if (action.type === 'CONTENT_UPLOAD') {

		newState = Object.assign({}, state);
		newState.contentUploadOperation = action.operation;

	}

	return newState;
}

const store = createStore(reducer);

bridge().init(window.browser ? window.browser : window.chrome, !!window.browser, store.dispatch);

console.info('Popup: Creating React app...');

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
