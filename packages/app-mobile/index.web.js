

import fontAwesomeFont from 'react-native-vector-icons/Fonts/FontAwesome.ttf';
import ioniconFont from 'react-native-vector-icons/Fonts/Ionicons.ttf';

// See https://www.npmjs.com/package/react-native-vector-icons
const setUpRnVectorIcons = () => {
	const iconFontStyles = `
		@font-face {
			src: url(${fontAwesomeFont});
			font-family: FontAwesome;
		}
		@font-face {
			src: url(${ioniconFont});
			font-family: Ionicons;
		}
	`;

	const style = document.createElement('style');
	style.appendChild(document.createTextNode(iconFontStyles));
	document.head.appendChild(style);
};
setUpRnVectorIcons();

import { AppRegistry } from 'react-native';
const Root = require('./root').default;

AppRegistry.registerComponent('Joplin', () => Root);//Root);

addEventListener('DOMContentLoaded', () => {
	console.log('DOMContentLoaded ☺');
	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});