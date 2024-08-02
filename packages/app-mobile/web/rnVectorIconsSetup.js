import fontAwesomeFont from 'react-native-vector-icons/Fonts/FontAwesome.ttf';
import fontAwesomeSolidFont from 'react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf';
import fontAwesomeRegularFont from 'react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf';
import fontAwesomeBrandsFont from 'react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf';
import ioniconFont from 'react-native-vector-icons/Fonts/Ionicons.ttf';
import materialCommunityIconsFont from 'react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf';
import antDesignFont from 'react-native-vector-icons/Fonts/AntDesign.ttf';

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
			src: url(${fontAwesomeRegularFont});
			font-family: FontAwesome5_Regular;
		}
		@font-face {
			src: url(${fontAwesomeBrandsFont});
			font-family: FontAwesome5_Brands;
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
			src: url(${antDesignFont});
			font-family: AntDesign;
		}
	`;

	const style = document.createElement('style');
	style.appendChild(document.createTextNode(iconFontStyles));
	document.head.appendChild(style);
};

setUpRnVectorIcons();
