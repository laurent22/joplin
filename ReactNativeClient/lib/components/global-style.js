import { Setting } from 'lib/models/setting.js';

const globalStyle = {
	fontSize: 16,
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	backgroundColor: "#ffffff",
	color: "#555555", // For regular text
	colorError: "red",
	colorWarn: "#9A5B00",
	colorFaded: "#777777", // For less important text
	fontSizeSmaller: 14,
	dividerColor: "#dddddd",
	selectedColor: '#e5e5e5',
	disabledOpacity: 0.3,

	raisedBackgroundColor: "#0080EF",
	raisedColor: "#003363",
	raisedHighlightedColor: "#ffffff",

	// For WebView - must correspond to the properties above
	htmlFontSize: '20x',
	htmlColor: 'black', // Note: CSS in WebView component only seem to work if the colour is written in full letters (so no hexadecimal)
	htmlDividerColor: 'Gainsboro',
};

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

let themeCache_ = {};

function themeStyle(theme) {
	if (themeCache_[theme]) return themeCache_[theme];

	let output = Object.assign({}, globalStyle);
	if (theme == Setting.THEME_LIGHT) return output;

	output.backgroundColor = '#1D2024';
	output.color = '#ffffff';
	output.colorFaded = '#777777';
	output.dividerColor = '#555555';
	output.selectedColor = '#333333';
	output.htmlColor = 'white';

	output.raisedBackgroundColor = "#0F2051";
	output.raisedColor = "#788BC3";
	output.raisedHighlightedColor = "#ffffff";

	themeCache_[theme] = output;
	return themeCache_[theme];
}

export { globalStyle, themeStyle }