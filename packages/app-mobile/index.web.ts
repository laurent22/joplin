import './utils/polyfills';
import { AppRegistry } from 'react-native';
import Root from './root';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import CommandService from '@joplin/lib/services/CommandService';
import RevisionService from '@joplin/lib/services/RevisionService';
import MigrationService from '@joplin/lib/services/MigrationService';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import Tag from '@joplin/lib/models/Tag';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';

require('./web/rnVectorIconsSetup.js');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary until Root doesn't extend `any`
AppRegistry.registerComponent('Joplin', () => Root as any);

// Fill properties not yet available in the TypeScript DOM types.
interface ExtendedNavigator extends Navigator {
	virtualKeyboard?: { overlaysContent: boolean };
}
declare const navigator: ExtendedNavigator;

// Add properties useful for debugging from the console window:
interface ExtendedWindow extends Window {
	joplin: unknown;
}
declare const window: ExtendedWindow;
if (__DEV__) {
	window.joplin = {
		Setting,
		Note,
		Folder,
		Tag,
		revisionService: RevisionService.instance(),
		migrationService: MigrationService.instance(),
		decryptionWorker: DecryptionWorker.instance(),
		commandService: CommandService.instance(),
		pluginService: PluginService.instance(),
		searchEngine: SearchEngine.instance(),
	};
}

// Should prevent the browser from auto-deleting background data.
const requestPersistentStorage = async () => {
	if (!(await navigator.storage.persisted())) {
		await navigator.storage.persist();
	}
};

const keepAppAboveKeyboard = () => {
	let updateQueued = false;

	// This prevents the virtual keyboard from covering content near the bottom of the screen
	// (e.g. the markdown toolbar) on both iOS and Android. As of June 2024, this can't be
	// done with the Virtual Keyboard API on iOS.
	const handleViewportChange = () => {
		if (updateQueued) return;

		updateQueued = true;
		requestAnimationFrame(() => {
			updateQueued = false;

			// The visual viewport changes as the user zooms in and out. Only adjust the body's height
			// when the user's (pinch/touchpad) zoom level is roughly 100% or less.
			if (window.visualViewport.scale <= 1.01) {
				document.body.style.height = `${window.visualViewport.height}px`;

				// Additional scroll space can also be added by the browser when focusing a text input (e.g.
				// the markdown editor). Make sure that the top of the editor is still visible:
				document.scrollingElement.scrollTop = 0;
			} else {
				document.body.style.height = '';
			}
		});
	};

	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', handleViewportChange);
	}
};

addEventListener('DOMContentLoaded', async () => {
	if (window.crossOriginIsolated === false) {
		// Currently, reloading should be handled by serviceWorker.ts -- this change is left for
		// debugging purposes.
		document.body.prepend(
			document.createTextNode('Warning: crossOriginIsolated is false. SharedArrayBuffer and similar APIs may not work correctly. Try refreshing the page.'),
		);
	}

	keepAppAboveKeyboard();
	void requestPersistentStorage();

	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});
