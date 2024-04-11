import { Theme, ThemeAppearance } from '../../themes/type';
import themeToCss from './themeToCss';

const input: Theme = {
	appearance: ThemeAppearance.Light,

	// Color scheme "1" is the basic one, like used to display the note
	// content. It's basically dark gray text on white background
	backgroundColor: '#ffffff',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: '#eeeeee',
	color: '#32373F', // For regular text
	colorError: 'red',
	colorCorrect: 'green',
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

	headerBackgroundColor: '#ffffff',
	textSelectionColor: '#a0a0ff',
	colorBright2: '#ffffff',
};

const expected = `
:root {
	--joplin-appearance: light;
	--joplin-background-color: #ffffff;
	--joplin-background-color2: #313640;
	--joplin-background-color3: #F4F5F6;
	--joplin-background-color4: #ffffff;
	--joplin-background-color-hover3: #CBDAF1;
	--joplin-background-color-transparent: rgba(255,255,255,0.9);
	--joplin-block-quote-opacity: 0.7;
	--joplin-code-background-color: rgb(243, 243, 243);
	--joplin-code-border-color: rgb(220, 220, 220);
	--joplin-code-color: rgb(0,0,0);
	--joplin-code-mirror-theme: default;
	--joplin-code-theme-css: atom-one-light.css;
	--joplin-color: #32373F;
	--joplin-color2: #ffffff;
	--joplin-color3: #738598;
	--joplin-color4: #2D6BDC;
	--joplin-color-bright2: #ffffff;
	--joplin-color-correct: green;
	--joplin-color-error: red;
	--joplin-color-error2: #ff6c6c;
	--joplin-color-faded: #7C8B9E;
	--joplin-color-warn: rgb(228,86,0);
	--joplin-color-warn2: #ffcb81;
	--joplin-color-warn3: #ff7626;
	--joplin-color-warn-url: #155BDA;
	--joplin-divider-color: #dddddd;
	--joplin-header-background-color: #ffffff;
	--joplin-odd-background-color: #eeeeee;
	--joplin-raised-background-color: #e5e5e5;
	--joplin-raised-color: #222222;
	--joplin-search-marker-background-color: #F7D26E;
	--joplin-search-marker-color: black;
	--joplin-selected-color: #e5e5e5;
	--joplin-selected-color2: #131313;
	--joplin-table-background-color: rgb(247, 247, 247);
	--joplin-text-selection-color: #a0a0ff;
	--joplin-url-color: #155BDA;
	--joplin-warning-background-color: #FFD08D;
}`;

describe('themeToCss', () => {

	it('should a theme to a CSS string', async () => {
		const actual = themeToCss(input);
		expect(actual.trim()).toBe(expected.trim());
	});

});
