import { Theme } from './type';
import theme_dark from './dark';

const theme: Theme = {
	...theme_dark,

	backgroundColor: '#002b36',
	backgroundColorTransparent: 'rgba(0, 43, 54, 0.9)',
	oddBackgroundColor: '#073642',
	color: '#839496', // For regular text
	colorError: '#dc322f',
	colorWarn: '#cb4b16',
	colorFaded: '#657b83', // For less important text;
	dividerColor: '#586e75',
	selectedColor: '#073642',
	urlColor: '#268bd2',

	backgroundColor2: '#073642',
	color2: '#eee8d5',
	selectedColor2: '#586e75',
	colorError2: '#cb4b16',

	backgroundColor3: '#012732',
	backgroundColorHover3: '#2aa19870',
	color3: '#93a1a1',

	backgroundColor4: '#073642',
	color4: '#93a1a1',

	raisedBackgroundColor: '#073642',
	raisedColor: '#839496',

	warningBackgroundColor: '#b5890055',

	tableBackgroundColor: '#002b36',
	codeBackgroundColor: '#002b36',
	codeBorderColor: '#696969',
	codeColor: '#839496',

	codeMirrorTheme: 'solarized dark',
	codeThemeCss: 'atom-one-dark-reasonable.css',
};

export default theme;
