import { AppRegistry } from 'react-native';
import Root from './root';

require('./web/rnVectorIconsSetup.js');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary until Root doesn't extend `any`
AppRegistry.registerComponent('Joplin', () => Root as any);

// Fill properties not yet available in the TypeScript DOM types.
interface ExtendedNavigator extends Navigator {
	virtualKeyboard?: { overlaysContent: boolean };
}
declare const navigator: ExtendedNavigator;

// Should prevent the browser from auto-deleting background data.
const requestPersistentStorage = async () => {
	if (!(await navigator.storage.persisted())) {
		await navigator.storage.persist();
	}
};

const enableKeyboardPositioningApi = () => {
	// This is needed to allow use of the env(keyboard-inset-height) CSS variable.
	if ('virtualKeyboard' in navigator) {
		navigator.virtualKeyboard.overlaysContent = true;
	}
};

addEventListener('DOMContentLoaded', () => {
	if (window.crossOriginIsolated === false) {
		// Currently, reloading might help because a service worker loaded by index.html
		// tries to enable crossOriginIsolated.
		// TODO: Handle this in a better way.
		document.body.appendChild(
			document.createTextNode('Warning: crossOriginIsolated is false. SharedArrayBuffer and similar APIs may not work correctly. Try refreshing the page.'),
		);
	}

	enableKeyboardPositioningApi();
	void requestPersistentStorage();

	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});
