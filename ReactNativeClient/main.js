// Note about the application structure:
// - The user interface and its state is managed by React/Redux.
// - Persistent storage to SQLite and Web API is handled outside of React/Redux using regular JavaScript (no middleware, no thunk, etc.).
// - Communication from React to SQLite is done by calling model methods (note.save, etc.)
// - Communication from SQLite to Redux is done via dispatcher.

// So there's basically still a one way flux: React => SQLite => Redux => React


// To disable warnings internal to React Native for componentWillMount and
// componentWillReceiveProps. Should be fixed at some point and at that
// time this code could be removed.
// https://github.com/facebook/react-native/issues/18165#issuecomment-369907978
// require("ReactFeatureFlags").warnAboutDeprecatedLifecycles = false;


// console.disableYellowBox = true

const { AppRegistry } = require('react-native');
const { Root } = require('./root.js');

function main() {
	AppRegistry.registerComponent('Joplin', () => Root);
	console.ignoredYellowBox = ['Remote debugger'];
	// Note: The final part of the initialization process is in
	// AppComponent.componentDidMount(), when the application is ready.
}

module.exports = { main };