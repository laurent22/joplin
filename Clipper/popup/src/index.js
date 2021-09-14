import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const { Provider } = require('react-redux');
const { bridge } = require('./bridge');
const { createStore, applyMiddleware } = require('redux');

const defaultState = {
	warning: '',
	clippedContent: null,
	contentUploadOperation: null,
	clipperServer: {
		foundState: 'idle',
		port: null,
	},
	folders: [],
	tags: [],
	selectedFolderId: null,
	env: 'prod',
	isProbablyReaderable: true,
};

const reduxMiddleware = store => next => async (action) => {
	const result = next(action);
	const newState = store.getState();

	if (['SELECTED_FOLDER_SET'].indexOf(action.type) >= 0) {
		bridge().scheduleStateSave(newState);
	}

	return result;
};

function reducer(state = defaultState, action) {
	let newState = state;

	if (action.type === 'WARNING_SET') {

		newState = Object.assign({}, state);
		newState.warning = action.text;

	} else if (action.type === 'IS_PROBABLY_READERABLE') {

		newState = Object.assign({}, state);
		newState.isProbablyReaderable = action.value;

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

	} else if (action.type === 'FOLDERS_SET') {

		newState = Object.assign({}, state);
		newState.folders = action.folders;

		if (!newState.selectedFolderId && action.folders.length) {
			newState.selectedFolderId = action.folders[0].id;
		}

	} else if (action.type === 'TAGS_SET') {

		newState = Object.assign({}, state);
		newState.tags = action.tags;

	} else if (action.type === 'SELECTED_FOLDER_SET') {

		newState = Object.assign({}, state);
		newState.selectedFolderId = action.id;

	} else if (action.type === 'CLIPPER_SERVER_SET') {

		newState = Object.assign({}, state);
		const clipperServer = Object.assign({}, newState.clipperServer);
		if ('foundState' in action) clipperServer.foundState = action.foundState;
		if ('port' in action) clipperServer.port = action.port;
		newState.clipperServer = clipperServer;

	} else if (action.type === 'ENV_SET') {

		newState = Object.assign({}, state);
		newState.env = action.env;

	}

	return newState;
}

async function main() {
	const store = createStore(reducer, applyMiddleware(reduxMiddleware));

	console.info('Popup: Init bridge and restore state...');

	await bridge().init(window.browser ? window.browser : window.chrome, !!window.browser, store);

	console.info('Popup: Creating React app...');

	ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
}

main().catch((error) => {
	console.error('Fatal error on initialisation:', error);
});
