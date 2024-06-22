import { AppRegistry } from 'react-native';
import Root from './root';

require('./web/rnVectorIconsSetup.js');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary until Root doesn't extend `any`
AppRegistry.registerComponent('Joplin', () => Root as any);

addEventListener('DOMContentLoaded', () => {
	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});
