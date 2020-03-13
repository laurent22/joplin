const Setting = require('lib/models/Setting.js');
const nordStyle = require('./gui/style/theme/nord');

// globalStyle should be used for properties that do not change across themes
// i.e. should not be used for colors
const globalStyle = {
	fontSize: 12,
	fontFamily: 'sans-serif',
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	fontSizeSmaller: 14,
	disabledOpacity: 0.3,
	buttonMinWidth: 50,
	buttonMinHeight: 30,
	editorFontSize: 12,
	textAreaLineHeight: 17,

	headerHeight: 35,
	headerButtonHPadding: 6,

	toolbarHeight: 35,
	tagItemPadding: 3,
};

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;
globalStyle.htmlMarginLeft = `${((globalStyle.marginLeft / 10) * 0.6).toFixed(2)}em`;

globalStyle.icon = {
	fontSize: 30,
};

globalStyle.lineInput = {
	fontFamily: globalStyle.fontFamily,
	maxHeight: 22,
	height: 22,
	paddingLeft: 5,
};

globalStyle.headerStyle = {
	fontFamily: globalStyle.fontFamily,
};

globalStyle.inputStyle = {
	border: '1px solid',
	height: 24,
	maxHeight: 24,
	paddingLeft: 5,
	paddingRight: 5,
	boxSizing: 'border-box',
};

globalStyle.containerStyle = {
	overflow: 'auto',
	overflowY: 'auto',
};

globalStyle.buttonStyle = {
	// marginRight: 10,
	border: '1px solid',
	minHeight: 26,
	minWidth: 80,
	// maxWidth: 220,
	paddingLeft: 12,
	paddingRight: 12,
	paddingTop: 6,
	paddingBottom: 6,
	boxShadow: '0px 1px 1px rgba(0,0,0,0.3)',
	fontSize: globalStyle.fontSize,
	borderRadius: 4,
};

const lightStyle = {
	backgroundColor: '#ffffff',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: '#dddddd',
	color: '#222222', // For regular text
	colorError: 'red',
	colorWarn: '#9A5B00',
	colorFaded: '#777777', // For less important text
	colorBright: '#000000', // For important text
	dividerColor: '#dddddd',
	selectedColor: '#e5e5e5',
	urlColor: '#155BDA',

	backgroundColor2: '#162B3D',
	depthColor: 'rgb(100, 182, 253, OPACITY)',
	color2: '#f5f5f5',
	selectedColor2: '#0269C2',
	colorError2: '#ff6c6c',

	raisedBackgroundColor: '#e5e5e5',
	raisedColor: '#222222',

	warningBackgroundColor: '#FFD08D',

	htmlColor: '#222222',
	htmlBackgroundColor: 'white',
	htmlDividerColor: 'rgb(230,230,230)',
	htmlLinkColor: 'rgb(80,130,190)',
	htmlTableBackgroundColor: 'rgb(247, 247, 247)',
	htmlCodeBackgroundColor: 'rgb(243, 243, 243)',
	htmlCodeBorderColor: 'rgb(220, 220, 220)',
	htmlCodeColor: 'rgb(0,0,0)',

	editorTheme: 'chrome',
	codeThemeCss: 'atom-one-light.css',
};

const darkStyle = {
	backgroundColor: '#1D2024',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: '#dddddd',
	color: '#dddddd',
	colorError: 'red',
	colorWarn: '#9A5B00',
	colorFaded: '#777777', // For less important text
	colorBright: '#ffffff', // For important text
	dividerColor: '#555555',
	selectedColor: '#333333',
	urlColor: '#4E87EE',

	backgroundColor2: '#181A1D',
	depthColor: 'rgb(200, 200, 200, OPACITY)',
	color2: '#ffffff',
	selectedColor2: '#013F74',
	colorError2: '#ff6c6c',

	raisedBackgroundColor: '#474747',
	raisedColor: '#ffffff',

	warningBackgroundColor: '#CC6600',

	htmlColor: 'rgb(220,220,220)',
	htmlBackgroundColor: 'rgb(29,32,36)',
	htmlDividerColor: '#3D444E',
	htmlCodeColor: '#ffffff',
	htmlLinkColor: 'rgb(166,166,255)',
	htmlTableBackgroundColor: 'rgb(40, 41, 42)',
	htmlCodeBackgroundColor: 'rgb(47, 48, 49)',
	htmlCodeBorderColor: 'rgb(70, 70, 70)',

	editorTheme: 'twilight',
	codeThemeCss: 'atom-one-dark-reasonable.css',

	highlightedColor: '#0066C7',
};

// Solarized Styles
const solarizedLightStyle = {
	backgroundColor: '#fdf6e3',
	backgroundColorTransparent: 'rgba(253, 246, 227, 0.9)',
	oddBackgroundColor: '#eee8d5',
	color: '#657b83', // For regular text
	colorError: '#dc322f',
	colorWarn: '#cb4b16',
	colorFaded: '#839496', // For less important text;
	colorBright: '#073642', // For important text;
	dividerColor: '#eee8d5',
	selectedColor: '#eee8d5',
	urlColor: '#268bd2',

	backgroundColor2: '#002b36',
	depthColor: 'rgb(100, 182, 253, OPACITY)',
	color2: '#eee8d5',
	selectedColor2: '#6c71c4',
	colorError2: '#cb4b16',

	raisedBackgroundColor: '#eee8d5',
	raisedColor: '#073642',

	warningBackgroundColor: '#b5890055',

	htmlColor: '#657b83',
	htmlBackgroundColor: '#fdf6e3',
	htmlDividerColor: '#eee8d5',
	htmlLinkColor: '#268bd2',
	htmlTableBackgroundColor: '#fdf6e3',
	htmlCodeBackgroundColor: '#fdf6e3',
	htmlCodeBorderColor: '#eee8d5',
	htmlCodeColor: '#002b36',

	editorTheme: 'solarized_light',
	codeThemeCss: 'atom-one-light.css',
};

const solarizedDarkStyle = {
	backgroundColor: '#002b36',
	backgroundColorTransparent: 'rgba(0, 43, 54, 0.9)',
	oddBackgroundColor: '#073642',
	color: '#93a1a1', // For regular text
	colorError: '#dc322f',
	colorWarn: '#cb4b16',
	colorFaded: '#657b83', // For less important text;
	colorBright: '#eee8d5', // For important text;
	dividerColor: '#586e75',
	selectedColor: '#073642',
	urlColor: '#268bd2',

	backgroundColor2: '#073642',
	depthColor: 'rgb(200, 200, 200, OPACITY)',
	color2: '#eee8d5',
	selectedColor2: '#6c71c4',
	colorError2: '#cb4b16',

	raisedBackgroundColor: '#073642',
	raisedColor: '#839496',

	warningBackgroundColor: '#b5890055',

	htmlColor: '#93a1a1',
	htmlBackgroundColor: '#002b36',
	htmlDividerColor: '#073642',
	htmlLinkColor: '#268bd2',
	htmlTableBackgroundColor: '#002b36',
	htmlCodeBackgroundColor: '#002b36',
	htmlCodeBorderColor: '#696969',
	htmlCodeColor: '#fdf6e3',

	editorTheme: 'solarized_dark',
	codeThemeCss: 'atom-one-dark-reasonable.css',
};

const draculaStyle = {
	backgroundColor: '#282a36',
	backgroundColorTransparent: 'rgba(40, 42, 54, 0.9)',
	oddBackgroundColor: '#282a36',
	color: '#f8f8f2', // For regular text
	colorError: '#ff5555',
	colorWarn: '#ffb86c',
	colorFaded: '#6272a4', // For less important text;
	colorBright: '#50fa7b', // For important text;
	dividerColor: '#bd93f9',
	selectedColor: '#44475a',
	urlColor: '#8be9fd',

	backgroundColor2: '#21222C',
	depthColor: 'rgb(200, 200, 200, OPACITY)',
	color2: '#bd93f9',
	selectedColor2: '#44475a',
	colorError2: '#ff5555',

	raisedBackgroundColor: '#44475a',
	raisedColor: '#bd93f9',

	warningBackgroundColor: '#ffb86c',

	htmlColor: '#f8f8f2',
	htmlBackgroundColor: '#282a36',
	htmlDividerColor: '#f8f8f2',
	htmlLinkColor: '#8be9fd',
	htmlTableBackgroundColor: '#6272a4',
	htmlCodeBackgroundColor: '#44475a',
	htmlCodeBorderColor: '#f8f8f2',
	htmlCodeColor: '#50fa7b',

	editorTheme: 'dracula',
	codeThemeCss: 'atom-one-dark-reasonable.css',
};

function addExtraStyles(style) {
	style.tagStyle = {
		fontSize: style.fontSize,
		fontFamily: style.fontFamily,
		marginTop: style.itemMarginTop * 0.4,
		marginBottom: style.itemMarginBottom * 0.4,
		marginRight: style.margin * 0.3,
		paddingTop: style.tagItemPadding,
		paddingBottom: style.tagItemPadding,
		paddingRight: style.tagItemPadding * 2,
		paddingLeft: style.tagItemPadding * 2,
		backgroundColor: style.raisedBackgroundColor,
		color: style.raisedColor,
	};

	style.toolbarStyle = {
		height: style.toolbarHeight,
		// minWidth: style.toolbarHeight,
		display: 'flex',
		alignItems: 'center',
		paddingLeft: style.headerButtonHPadding,
		paddingRight: style.headerButtonHPadding,
		textDecoration: 'none',
		fontFamily: style.fontFamily,
		fontSize: style.fontSize,
		boxSizing: 'border-box',
		cursor: 'default',
		justifyContent: 'center',
		color: style.color,
		whiteSpace: 'nowrap',
	};

	style.textStyle = {
		fontFamily: globalStyle.fontFamily,
		fontSize: style.fontSize,
		lineHeight: '1.6em',
		color: style.color,
	};

	style.textStyle2 = Object.assign({}, style.textStyle,
		{ color: style.color2 }
	);

	style.urlStyle = Object.assign({}, style.textStyle,
		{
			textDecoration: 'underline',
			color: style.urlColor,
		}
	);

	style.h1Style = Object.assign({},
		style.textStyle,
		{
			color: style.color,
			fontSize: style.textStyle.fontSize * 1.5,
			fontWeight: 'bold',
		}
	);

	style.h2Style = Object.assign({},
		style.textStyle,
		{
			color: style.color,
			fontSize: style.textStyle.fontSize * 1.3,
			fontWeight: 'bold',
		}
	);

	style.dialogModalLayer = {
		zIndex: 9999,
		display: 'flex',
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		backgroundColor: 'rgba(0,0,0,0.6)',
		alignItems: 'flex-start',
		justifyContent: 'center',
	};

	style.controlBox = {
		marginBottom: '1em',
		color: 'black', // This will apply for the calendar
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
	};

	style.controlBoxLabel = {
		marginRight: '1em',
		width: '10em',
		display: 'inline-block',
		fontWeight: 'bold',
	};

	style.controlBoxValue = {
		display: 'inline-block',
	};

	style.dialogBox = {
		backgroundColor: style.backgroundColor,
		padding: 16,
		boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
		marginTop: 20,
	};

	style.buttonIconStyle = {
		color: style.color,
		marginRight: 6,
	};

	style.dialogTitle = Object.assign({}, style.h1Style, { marginBottom: '1.2em' });

	style.dropdownList = Object.assign({}, style.inputStyle);

	// In general the highlighted color, used to highlight text or icons, should be the same as selectedColor2
	// but some times, depending on the theme, it might be too dark or too light, so it can be
	// specified directly by the theme too.
	if (!style.highlightedColor) style.highlightedColor = style.selectedColor2;

	return style;
}

let themeCache_ = {};

function themeStyle(theme) {
	if (!theme) throw new Error('Theme must be specified');

	var zoomRatio = 1; // Setting.value('style.zoom') / 100;
	var editorFontSize = Setting.value('style.editor.fontSize');

	const cacheKey = [theme, zoomRatio, editorFontSize].join('-');
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	// Font size are not theme specific, but they must be referenced
	// and computed here to allow them to respond to settings changes
	// without the need to restart
	let fontSizes = {
		fontSize: Math.round(globalStyle.fontSize * zoomRatio),
		editorFontSize: editorFontSize,
		textAreaLineHeight: Math.round(globalStyle.textAreaLineHeight * editorFontSize / 12),

		// For WebView - must correspond to the properties above
		htmlFontSize: `${Math.round(15 * zoomRatio)}px`,
		htmlLineHeight: '1.6em', // Math.round(20 * zoomRatio) + 'px'

		htmlCodeFontSize: '.9em',
	};

	let output = {};
	output.zoomRatio = zoomRatio;
	output.editorFontSize = editorFontSize;

	// All theme are based on the light style, and just override the
	// relevant properties
	output = Object.assign({}, globalStyle, fontSizes, lightStyle);

	switch (theme) {
	case Setting.THEME_DARK :
		output = Object.assign({}, output, darkStyle); break;
	case Setting.THEME_SOLARIZED_LIGHT :
		output = Object.assign({}, output, solarizedLightStyle); break;
	case Setting.THEME_SOLARIZED_DARK :
		output = Object.assign({}, output, solarizedDarkStyle); break;
	case Setting.THEME_DRACULA :
		output = Object.assign({}, output, draculaStyle); break;
	case Setting.THEME_NORD :
		output = Object.assign({}, output, nordStyle); break;
	}

	// Note: All the theme specific things should go in addExtraStyles
	// so that their definition is not split between here and the
	// beginning of the file. At least new styles should go in
	// addExtraStyles.

	output.icon = Object.assign({},
		output.icon,
		{ color: output.color }
	);

	output.lineInput = Object.assign({},
		output.lineInput,
		{
			color: output.color,
			backgroundColor: output.backgroundColor,
		}
	);

	output.headerStyle = Object.assign({},
		output.headerStyle,
		{
			color: output.color,
			backgroundColor: output.backgroundColor,
		}
	);

	output.inputStyle = Object.assign({},
		output.inputStyle,
		{
			color: output.color,
			backgroundColor: output.backgroundColor,
			borderColor: output.dividerColor,
		}
	);

	output.containerStyle = Object.assign({},
		output.containerStyle,
		{
			color: output.color,
			backgroundColor: output.backgroundColor,
		}
	);

	output.buttonStyle = Object.assign({},
		output.buttonStyle,
		{
			color: output.color,
			backgroundColor: output.backgroundColor,
			borderColor: output.dividerColor,
		}
	);

	output = addExtraStyles(output);

	themeCache_[cacheKey] = output;
	return themeCache_[cacheKey];
}

const cachedStyles_ = {};

function buildStyle(cacheKey, themeId, callback) {
	if (cachedStyles_[cacheKey]) cachedStyles_[cacheKey].style;

	const s = callback(themeStyle(themeId));

	cachedStyles_[cacheKey] = {
		style: s,
		timestamp: Date.now(),
	};

	return cachedStyles_[cacheKey].style;
}

module.exports = { themeStyle, buildStyle };
