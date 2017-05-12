import { AppRegistry } from 'react-native';
import { Log } from 'src/log.js'
import { Root } from 'src/root.js';
import { Registry } from 'src/registry.js';
import { Database } from 'src/database.js';

function main() {
	Registry.setDebugMode(true);
	AppRegistry.registerComponent('AwesomeProject', () => Root);
	// Note: The final part of the initialization process is in
	// AppComponent.componentDidMount(), when the application is ready.
}

export { main }