// Note about the application structure:
// - The user interface and its state is managed by React/Redux.
// - Persistent storage to SQLite and Web API is handled outside of React/Redux using regular JavaScript (no middleware, no thunk, etc.).
// - Communication from React to SQLite is done by calling model methods (note.save, etc.)
// - Communication from SQLite to Redux is done via dispatcher.

// So there's basically still a one way flux: React => SQLite => Redux => React

// For aws-sdk-js-v3
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Set up required for react-native-gesture-handler (see: https://docs.swmansion.com/react-native-gesture-handler/docs/installation)
import 'react-native-gesture-handler';

import { LogBox, AppRegistry } from 'react-native';
const Root = require('./root').default;

// Seems JavaScript developers love adding warnings everywhere, even when these warnings can't be fixed
// or don't really matter. Because we want important warnings to actually be fixed, we disable
// all the useless ones, that way we aren't flooded by them when the app starts, and when there's
// one we know it should be fixed (or added here).
LogBox.ignoreLogs([
	// Happens for example in react-native-side-menu, but the package is discontinued
	// and we should just switch to a different one (or do it without a package).
	'Animated: `useNativeDriver` was not specified. This is a required option and must be explicitly set to `true` or `false`',

	// What's the point of printing warnings for non-user code. Of all the things that
	// are broken and unreliable in React Native, require cycles are just a minor annoyance
	// which shouldn't forever print warnings.
	// To make it more fun, they don't normalise paths so forward slashes and backward slashes
	// need to be handled to support Windows.
	'Require cycle: node_modules/react-native-',
	'Require cycle: node_modules\\react-native-',
	'Require cycle: node_modules/rn-fetch-blob',
	'Require cycle: node_modules\\rn-fetch-blob',
	'Require cycle: node_modules/aws-sdk',
	'Require cycle: node_modules\\aws-sdk',
	'Require cycle: ../lib/node_modules/aws-sdk',
	'Require cycle: ..\\lib\\node_modules\\aws-sdk',

	// It's being updated over time and we don't need to see these warnings all the time
	'Warning: componentWillReceiveProps has been renamed',
	'Warning: componentWillUpdate has been renamed',
	'Warning: componentWillMount has been renamed',

	// Triggered by react-native-webview. Happens on slow devices when loading the note viewer.
	// Apparently it can be safely ignored:
	// https://github.com/react-native-webview/react-native-webview/issues/124
	'Did not receive response to shouldStartLoad in time, defaulting to YES',

	// Emitted by react-native-popup-menu
	'MenuContext is deprecated and it might be removed in future releases, use MenuProvider instead.',
]);

AppRegistry.registerComponent('Joplin', () => Root);

// Using streams on react-native requires to polyfill process.nextTick()
global.process.nextTick = setImmediate;
