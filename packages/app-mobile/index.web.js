
// Set up required for react-native-drawer-layout (See: https://reactnavigation.org/docs/drawer-layout/ v6.x)
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
const Root = require('./root').default;

AppRegistry.registerComponent('Joplin', () => Root);//Root);

addEventListener('DOMContentLoaded', () => {
	console.log('DOMContentLoaded ☺');
	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});