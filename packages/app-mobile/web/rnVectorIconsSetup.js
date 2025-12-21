import fontAwesomeSolidFont from '@react-native-vector-icons/fontawesome5/fonts/FontAwesome5_Solid.ttf';
import fontAwesomeRegularFont from '@react-native-vector-icons/fontawesome5/fonts/FontAwesome5_Regular.ttf';
import fontAwesomeBrandsFont from '@react-native-vector-icons/fontawesome5/fonts/FontAwesome5_Brands.ttf';
import ioniconFont from '@react-native-vector-icons/ionicons/fonts/Ionicons.ttf';
import materialCommunityIconsFont from '@react-native-vector-icons/material-icons/fonts/MaterialIcons.ttf';
import materialIconsFont from '@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf';

// See https://www.npmjs.com/package/react-native-vector-icons
const setUpRnVectorIcons = () => {
	const iconFontStyles = `
		@font-face {
			src: url(${fontAwesomeSolidFont});
			font-family: FontAwesome5Free-Solid;
		}
		@font-face {
			src: url(${fontAwesomeRegularFont});
			font-family: FontAwesome5Free-Regular;
		}
		@font-face {
			src: url(${fontAwesomeBrandsFont});
			font-family: FontAwesome5Brands-Regular;
		}
		@font-face {
			src: url(${ioniconFont});
			font-family: Ionicons;
		}
		@font-face {
			src: url(${materialCommunityIconsFont});
			font-family: MaterialCommunityIcons;
		}
		@font-face {
			src: url(${materialIconsFont});
			font-family: MaterialDesignIcons;
		}
	`;

	const style = document.createElement('style');
	style.appendChild(document.createTextNode(iconFontStyles));
	document.head.appendChild(style);
};

setUpRnVectorIcons();
