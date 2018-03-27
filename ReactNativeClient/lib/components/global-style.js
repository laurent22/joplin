const Setting = require('lib/models/Setting.js');
const { Platform } = require('react-native');

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
	disabledOpacity: 0.2,
	colorUrl: '#000CFF',

	raisedBackgroundColor: "#0080EF",
	raisedColor: "#003363",
	raisedHighlightedColor: "#ffffff",

	warningBackgroundColor: "#FFD08D",

	// For WebView - must correspond to the properties above
	htmlFontSize: '16px',
	htmlColor: 'black', // Note: CSS in WebView component only supports named colors or rgb() notation
	htmlBackgroundColor: 'white',
	htmlDividerColor: 'Gainsboro',
	htmlLinkColor: 'blue',
	htmlLineHeight: '20px',
};

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;
globalStyle.htmlMarginLeft = ((globalStyle.marginLeft / 10) * 0.6).toFixed(2) + 'em';

// globalStyle.icon = {
// 	color: globalStyle.color,
// 	fontSize: 30,
// };

// globalStyle.lineInput = {
// 	color: globalStyle.color,
// 	backgroundColor: globalStyle.backgroundColor,
// };

// globalStyle.buttonRow = {
// 	flexDirection: 'row',
// 	borderTopWidth: 1,
// 	borderTopColor: globalStyle.dividerColor,
// 	paddingTop: 10,
// };

// globalStyle.normalText = {
// 	color: globalStyle.color,
// 	fontSize: globalStyle.fontSize,
// };

let themeCache_ = {};

function addExtraStyles(style) {
	style.icon = {
		color: style.color,
		fontSize: 30,
	};

	style.lineInput = {
		color: style.color,
		backgroundColor: style.backgroundColor,
	};

	if (Platform.OS === 'ios') {
		style.lineInput.borderBottomWidth = 1;
		style.lineInput.borderBottomColor = style.dividerColor;
	}

	style.buttonRow = {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: style.dividerColor,
		paddingTop: 10,
	};

	style.normalText = {
		color: style.color,
		fontSize: style.fontSize,
	};

	style.urlText = {
		color: style.colorUrl,
		fontSize: style.fontSize,
	};

	return style;
}

function themeStyle(theme) {
	if (!theme) throw new Error('Theme not set');

	if (themeCache_[theme]) return themeCache_[theme];

	let output = Object.assign({}, globalStyle);
	if (theme == Setting.THEME_LIGHT) return addExtraStyles(output);

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
	return addExtraStyles(themeCache_[theme]);
}

module.exports = { globalStyle, themeStyle };