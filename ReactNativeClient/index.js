// Note about the application structure:
// - The user interface and its state is managed by React/Redux.
// - Persistent storage to SQLite and Web API is handled outside of React/Redux using regular JavaScript (no middleware, no thunk, etc.).
// - Communication from React to SQLite is done by calling model methods (note.save, etc.)
// - Communication from SQLite to Redux is done via dispatcher.

// So there's basically still a one way flux: React => SQLite => Redux => React

import {LogBox, AppRegistry} from 'react-native';
const {Root} = require('./root.js');

LogBox.ignoreLogs([
	// Happens for example in react-native-side-menu, but the package is discontinued
	// and we should just switch to a different one (or do it without a package).
	'Animated: `useNativeDriver` was not specified. This is a required option and must be explicitly set to `true` or `false`',
	
	// What's the point of printing warnings for non-user code. Of all the things that
	// are broken and unreliable in React Native, require cycles are just a minor annoyance
	// which shouldn't forever print warnings.
	'Require cycle: node_modules/react-native-',
	'Require cycle: node_modules/rn-fetch-blob',
	'Require cycle: node_modules/aws-sdk',
	
	// It's being updated over time and we don't need to see these warnings all the time
	'Warning: componentWillReceiveProps has been renamed',
	'Warning: componentWillUpdate has been renamed',
	'Warning: componentWillMount has been renamed',
]);

AppRegistry.registerComponent('Joplin', () => Root);
