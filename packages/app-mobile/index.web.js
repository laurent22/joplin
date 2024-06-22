import fontAwesomeFont from 'react-native-vector-icons/Fonts/FontAwesome.ttf';
import fontAwesomeSolidFont from 'react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf';
import ioniconFont from 'react-native-vector-icons/Fonts/Ionicons.ttf';
import materialCommunityIconsFont from 'react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf';

// See https://www.npmjs.com/package/react-native-vector-icons
const setUpRnVectorIcons = () => {
	const iconFontStyles = `
		@font-face {
			src: url(${fontAwesomeFont});
			font-family: FontAwesome;
		}
		@font-face {
			src: url(${fontAwesomeSolidFont});
			font-family: FontAwesome5_Solid;
		}
		@font-face {
			src: url(${ioniconFont});
			font-family: Ionicons;
		}
		@font-face {
			src: url(${materialCommunityIconsFont});
			font-family: MaterialCommunityIcons;
		}
	`;

	const style = document.createElement('style');
	style.appendChild(document.createTextNode(iconFontStyles));
	document.head.appendChild(style);
};
setUpRnVectorIcons();

import { AppRegistry } from 'react-native';
const Root = require('./root').default;

AppRegistry.registerComponent('Joplin', () => Root);

addEventListener('DOMContentLoaded', () => {
	AppRegistry.runApplication('Joplin', {
		rootTag: document.querySelector('#root'),
	});
});
