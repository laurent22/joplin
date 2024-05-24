import { Theme, ThemeAppearance } from './type';
import lightTheme from './light';

// This is the default dark theme in Joplin
const theme: Theme = {
	...lightTheme,

	appearance: ThemeAppearance.Dark,

	// Color scheme "1" is the basic one, like used to display the note
	// content. It's basically dark gray text on white background
	backgroundColor: '#1D2024',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: '#141517',
	color: '#dddddd',
	colorError: 'red',
	colorCorrect: '#72b972',
	colorWarn: '#9A5B00',
	colorWarnUrl: '#ffff82',
	colorFaded: '#999999', // For less important text
	dividerColor: '#555555',
	selectedColor: '#616161',
	urlColor: 'rgb(166,166,255)',

	// Color scheme "2" is used for the sidebar. It's white text over
	// dark blue background.
	backgroundColor2: '#181A1D',
	color2: '#ffffff',
	selectedColor2: '#013F74',
	colorError2: '#ff6c6c',
	colorWarn2: '#ffcb81',
	colorWarn3: '#ffcb81',

	// Color scheme "3" is used for the config screens for example/
	// It's dark text over gray background.
	backgroundColor3: '#2E3138',
	backgroundColorHover3: '#4E4E4E',
	color3: '#dddddd',

	// Color scheme "4" is used for secondary-style buttons. It makes a white
	// button with blue text.
	backgroundColor4: '#1D2024',
	color4: '#789FE9',

	raisedBackgroundColor: '#474747',
	raisedColor: '#ffffff',
	searchMarkerBackgroundColor: '#F7D26E',
	searchMarkerColor: 'black',

	warningBackgroundColor: '#013F74',

	tableBackgroundColor: 'rgb(40, 41, 42)',
	codeBackgroundColor: 'rgb(47, 48, 49)',
	codeBorderColor: 'rgb(70, 70, 70)',
	codeColor: '#ffffff',

	codeMirrorTheme: 'material-darker',
	codeThemeCss: 'atom-one-dark-reasonable.css',

	headerBackgroundColor: '#2D3136',
	textSelectionColor: '#00AEFF',
};

export default theme;
