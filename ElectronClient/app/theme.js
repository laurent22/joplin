const Setting = require('lib/models/Setting.js');

const zoomRatio = Setting.value('style.zoom') / 100;

// globalStyle should be used for properties that do not change across themes
// i.e. should not be used for colors
const globalStyle = {
	fontSize: Math.round(12 * zoomRatio),
	fontFamily: 'sans-serif',
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	fontSizeSmaller: 14,
	disabledOpacity: 0.3,
	buttonMinWidth: 50,
	buttonMinHeight: 30,
	textAreaLineHeight: 17,

	headerHeight: 35,
	headerButtonHPadding: 6,

	toolbarHeight: 35,
	tagItemPadding: 3,
	tagBackgroundColor: '#e5e5e5',
};

// For WebView - must correspond to the properties above
globalStyle.htmlFontSize = globalStyle.fontSize + 'px';
globalStyle.htmlLineHeight = Math.round(20 * zoomRatio) + 'px';

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;
globalStyle.htmlMarginLeft = ((globalStyle.marginLeft / 10) * 0.6).toFixed(2) + 'em';

globalStyle.icon = {
	fontSize: 30,
};

globalStyle.lineInput = {
	fontFamily: globalStyle.fontFamily,
};

globalStyle.textStyle = {
	fontFamily: globalStyle.fontFamily,
	fontSize: globalStyle.fontSize,
	lineHeight: '1.6em',
};

globalStyle.textStyle2 = Object.assign({}, globalStyle.textStyle, {});

globalStyle.urlStyle = Object.assign({}, globalStyle.textStyle, { textDecoration: 'underline' });

globalStyle.h1Style = Object.assign({}, globalStyle.textStyle);
globalStyle.h1Style.fontSize *= 1.5;
globalStyle.h1Style.fontWeight = 'bold';

globalStyle.h2Style = Object.assign({}, globalStyle.textStyle);
globalStyle.h2Style.fontSize *= 1.3;
globalStyle.h2Style.fontWeight = 'bold';

globalStyle.toolbarStyle = {
	height: globalStyle.toolbarHeight,
	minWidth: globalStyle.toolbarHeight,
	display: 'flex',
	alignItems: 'center',
	paddingLeft: globalStyle.headerButtonHPadding,
	paddingRight: globalStyle.headerButtonHPadding,
	textDecoration: 'none',
	fontFamily: globalStyle.fontFamily,
	fontSize: globalStyle.fontSize,
	boxSizing: 'border-box',
	cursor: 'default',
	justifyContent: 'center',
};

globalStyle.headerStyle = {};

globalStyle.inputStyle = {
	border: '1px solid',
};

globalStyle.containerStyle = {
	overflow: 'auto',
	overflowY: 'auto',
};

globalStyle.buttonStyle = {
	marginRight: 10,
	border: '1px solid',
};

const lightStyle = {
	backgroundColor: "#ffffff",
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: "#dddddd",
	color: "#222222", // For regular text
	colorError: "red",
	colorWarn: "#9A5B00",
	colorFaded: "#777777", // For less important text
	dividerColor: "#dddddd",
	selectedColor: '#e5e5e5',
	urlColor: '#155BDA',

	backgroundColor2: "#162B3D",
	color2: "#ffffff",
	selectedColor2: "#0269C2",
	colorError2: "#ff6c6c",

	raisedBackgroundColor: "#0080EF",
	raisedColor: "#003363",
	raisedHighlightedColor: "#ffffff",

	warningBackgroundColor: "#FFD08D",

	codeColor: "#EFF0F1",
	codeBorderColor: '#CBCBCB',

	htmlColor:'black', // Note: CSS in WebView component only supports named colors or rgb() notation
	htmlBackgroundColor: 'white',
	htmlDividerColor: 'rgb(150,150,150)',
	htmlLinkColor: 'blue',
	htmlCodeColor: 'rgb(239, 240, 241)',
	htmlCodeBorderColor: 'rgb(203, 203, 203)',

	editorTheme: "chrome",
	codeThemeCss: "atom-one-light.css",
};

const darkStyle = {
	backgroundColor: '#1D2024',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: "#dddddd",
	color: '#dddddd',
	colorFaded: '#777777',
	colorError: "red",
	colorWarn: "#9A5B00",
	colorFaded: "#777777", // For less important text
	dividerColor: '#555555',
	selectedColor: '#333333',
	urlColor: '#4E87EE',

	backgroundColor2: "#162B3D",
	color2: "#ffffff",
	selectedColor2: "#0269C2",
	colorError2: "#ff6c6c",

	raisedBackgroundColor: "#0F2051",
	raisedColor: "#788BC3",
	raisedHighlightedColor: "#ffffff",

	warningBackgroundColor: "#CC6600",

	codeColor: "#2F3031",
	codeBorderColor: '#464646',

	htmlColor: 'rgb(220,220,220)', // Note: CSS in WebView component only supports named colors or rgb() notation
	htmlBackgroundColor: 'rgb(29,32,36)',
	htmlDividerColor: 'rgb(150,150,150)',
	htmlLinkColor: 'rgb(166,166,255)',
	htmlCodeColor: 'rgb(47, 48, 49)',
	htmlCodeBorderColor: 'rgb(70, 70, 70)',

	editorTheme: 'twilight',
	codeThemeCss: "atom-one-dark-reasonable.css",
};

globalStyle.tagStyle = {
	fontSize: globalStyle.fontSize,
	fontFamily: globalStyle.fontFamily,
	marginTop: globalStyle.itemMarginTop * 0.4,
	marginBottom: globalStyle.itemMarginBottom * 0.4,
	marginRight: globalStyle.margin * 0.3,
	paddingTop: globalStyle.tagItemPadding,
	paddingBottom: globalStyle.tagItemPadding,
	paddingRight: globalStyle.tagItemPadding * 2,
	paddingLeft: globalStyle.tagItemPadding * 2,
	backgroundColor: globalStyle.tagBackgroundColor
};

let themeCache_ = {};

function themeStyle(theme) {
	if (!theme) throw new Error('Theme must be specified');
	if (themeCache_[theme]) return themeCache_[theme];

	let output = {};
	if (theme == Setting.THEME_LIGHT) {
		output = Object.assign({}, globalStyle, lightStyle);
	}
	else if (theme == Setting.THEME_DARK) {
		output = Object.assign({}, globalStyle, darkStyle);
	}

	output.textStyle = Object.assign({},
		output.textStyle,
		{ color: output.color }
	);

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

	output.textStyle2 = Object.assign({},
		output.textStyle2,
		{ color: output.color2, }
	);

	output.urlStyle = Object.assign({},
		output.urlStyle,
		{ color: output.urlColor }
	);

	output.h1Style = Object.assign({},
		output.h1Style,
		{ color: output.color }
	);

	output.h2Style = Object.assign({},
		output.h2Style,
		{ color: output.color }
	);

	output.toolbarStyle = Object.assign({},
		output.toolbarStyle,
		{ color: output.color }
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

	themeCache_[theme] = output;
	return themeCache_[theme];
}

module.exports = { themeStyle };
