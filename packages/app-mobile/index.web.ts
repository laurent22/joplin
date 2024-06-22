import { AppRegistry } from 'react-native';
import Root from './root';

require('./web/rnVectorIconsSetup.js');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary until Root doesn't extend `any`
AppRegistry.registerComponent('Joplin', () => Root as any);

addEventListener('DOMContentLoaded', () => {
	if (window.crossOriginIsolated === false) {
		// Currently, reloading might help because a service worker loaded by index.html
		// tries to enable crossOriginIsolated.
		// TODO: Handle this in a better way.
		document.body.appendChild(
			document.createTextNode('Warning: crossOriginIsolated is false. SharedArrayBuffer and similar APIs may not work correctly. Try refreshing the page.'),
		);
	}

	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});
