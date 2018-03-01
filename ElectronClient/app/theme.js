const Setting = require('lib/models/Setting.js');

const globalStyle = {
	fontSize: 12 * Setting.value('style.zoom')/100,
	fontFamily: 'sans-serif',
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	backgroundColor: "#ffffff",
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: "#dddddd",
	color: "#222222", // For regular text
	colorError: "red",
	colorWarn: "#9A5B00",
	colorFaded: "#777777", // For less important text
	fontSizeSmaller: 14,
	dividerColor: "#dddddd",
	selectedColor: '#e5e5e5',
	disabledOpacity: 0.3,
	buttonMinWidth: 50,
	buttonMinHeight: 30,
	textAreaLineHeight: 17,

	backgroundColor2: "#2B2634",
	color2: "#ffffff",
	selectedColor2: "#5A4D70",
	colorError2: "#ff6c6c",

	warningBackgroundColor: "#FFD08D",

	headerHeight: 35,
	headerButtonHPadding: 6,

	toolbarHeight: 35,

	raisedBackgroundColor: "#0080EF",
	raisedColor: "#003363",
	raisedHighlightedColor: "#ffffff",
};

// For WebView - must correspond to the properties above
globalStyle.htmlFontSize = globalStyle.fontSize + 'px';
globalStyle.htmlColor ='black'; // Note: CSS in WebView component only supports named colors or rgb() notation
globalStyle.htmlBackgroundColor ='white';
globalStyle.htmlDividerColor = 'rgb(150,150,150)';
globalStyle.htmlLinkColor ='blue';
globalStyle.htmlLineHeight ='20px';

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;
globalStyle.htmlMarginLeft = ((globalStyle.marginLeft / 10) * 0.6).toFixed(2) + 'em';

globalStyle.icon = {
	color: globalStyle.color,
	fontSize: 30,
};

globalStyle.lineInput = {
	color: globalStyle.color,
	backgroundColor: globalStyle.backgroundColor,
};

globalStyle.textStyle = {
	color: globalStyle.color,
	fontFamily: globalStyle.fontFamily,
	fontSize: globalStyle.fontSize,
	lineHeight: '1.6em',
};

globalStyle.textStyle2 = Object.assign({}, globalStyle.textStyle, {
	color: globalStyle.color2,
});

globalStyle.h1Style = Object.assign({}, globalStyle.textStyle);
globalStyle.h1Style.fontSize *= 1.5;

globalStyle.h2Style = Object.assign({}, globalStyle.textStyle);
globalStyle.h2Style.fontSize *= 1.3;

let themeCache_ = {};

function themeStyle(theme) {
	if (!theme) throw new Error('Theme must be specified');
	if (themeCache_[theme]) return themeCache_[theme];

	let output = Object.assign({}, globalStyle);
	if (theme == Setting.THEME_LIGHT) return output;

	output.backgroundColor = '#1D2024';
	output.color = '#dddddd';
	output.colorFaded = '#777777';
	output.dividerColor = '#555555';
	output.selectedColor = '#333333';

	output.raisedBackgroundColor = "#0F2051";
	output.raisedColor = "#788BC3";
	output.raisedHighlightedColor = "#ffffff";

	output.htmlColor = 'rgb(220,220,220)';
	output.htmlBackgroundColor = 'rgb(29,32,36)';
	output.htmlLinkColor = 'rgb(166,166,255)';

	themeCache_[theme] = output;
	return themeCache_[theme];
}

module.exports = { themeStyle };