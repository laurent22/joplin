// Note about the application structure:
// - The user interface and its state is managed by React/Redux.
// - Persistent storage to SQLite and Web API is handled outside of React/Redux using regular JavaScript (no middleware, no thunk, etc.).
// - Communication from React to SQLite is done by calling model methods (note.save, etc.)
// - Communication from SQLite to Redux is done via dispatcher.

// So there's basically still a one way flux: React => SQLite => Redux => React

import { AppRegistry } from 'react-native';
import { Log } from 'src/log.js'
import { Root } from 'src/root.js';
import { Registry } from 'src/registry.js';

function main() {
	Registry.setDebugMode(true);
	AppRegistry.registerComponent('AwesomeProject', () => Root);
	// Note: The final part of the initialization process is in
	// AppComponent.componentDidMount(), when the application is ready.
}

export { main }