// Note about the application structure:
// - The user interface and its state is managed by React/Redux.
// - Persistent storage to SQLite and Web API is handled outside of React/Redux using regular JavaScript (no middleware, no thunk, etc.).
// - Communication from React to SQLite is done by calling model methods (note.save, etc.)
// - Communication from SQLite to Redux is done via dispatcher.

// So there's basically still a one way flux: React => SQLite => Redux => React

// console.disableYellowBox = true

import { YellowBox, AppRegistry } from 'react-native';
YellowBox.ignoreWarnings([
	'Require cycle: node_modules/react-native-',
	'Require cycle: node_modules/rn-fetch-blob',
	'Warning: componentWillReceiveProps has been renamed',
	'Warning: componentWillUpdate has been renamed',
	'Warning: componentWillMount has been renamed',
]);
const { Root } = require('./root.js');

// Disable buggy Fast Refresh
// NOTE: not working - can make the app go into an infinite crash/restart loop
// if (__DEV__) {
// 	const { DevSettings } = NativeModules;
// 	DevSettings.setHotLoadingEnabled(false);
// 	DevSettings.setLiveReloadEnabled(false);
// }

function main() {
	AppRegistry.registerComponent('Joplin', () => Root);
	console.ignoredYellowBox = ['Remote debugger'];
	// Note: The final part of the initialization process is in
	// AppComponent.componentDidMount(), when the application is ready.
}

module.exports = { main };
