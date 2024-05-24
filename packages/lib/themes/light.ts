import { Theme, ThemeAppearance } from './type';

// This is the default theme in Joplin
const theme: Theme = {
	appearance: ThemeAppearance.Light,

	// Color scheme "1" is the basic one, like used to display the note
	// content. It's basically dark gray text on white background
	backgroundColor: '#ffffff',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: '#eeeeee',
	color: '#32373F', // For regular text
	colorError: 'red',
	colorCorrect: 'green', // Opposite of colorError
	colorWarn: 'rgb(228,86,0)',
	colorWarnUrl: '#155BDA',
	colorFaded: '#7C8B9E', // For less important text
	dividerColor: '#dddddd',
	selectedColor: '#e5e5e5',
	urlColor: '#155BDA',

	// Color scheme "2" is used for the sidebar. It's white text over
	// dark blue background.
	backgroundColor2: '#313640',
	color2: '#ffffff',
	selectedColor2: '#131313',
	colorError2: '#ff6c6c',
	colorWarn2: '#ffcb81',
	colorWarn3: '#ff7626',

	// Color scheme "3" is used for the config screens for example/
	// It's dark text over gray background.
	backgroundColor3: '#F4F5F6',
	backgroundColorHover3: '#CBDAF1',
	color3: '#738598',

	// Color scheme "4" is used for secondary-style buttons. It makes a white
	// button with blue text.
	backgroundColor4: '#ffffff',
	color4: '#2D6BDC',

	raisedBackgroundColor: '#e5e5e5',
	raisedColor: '#222222',
	searchMarkerBackgroundColor: '#F7D26E',
	searchMarkerColor: 'black',

	warningBackgroundColor: '#FFD08D',

	tableBackgroundColor: 'rgb(247, 247, 247)',
	codeBackgroundColor: 'rgb(243, 243, 243)',
	codeBorderColor: 'rgb(220, 220, 220)',
	codeColor: 'rgb(0,0,0)',

	blockQuoteOpacity: 0.7,

	codeMirrorTheme: 'default',
	codeThemeCss: 'atom-one-light.css',

	headerBackgroundColor: '#F0F0F0',
	textSelectionColor: '#0096FF',
	colorBright2: '#ffffff',
};

export default theme;
