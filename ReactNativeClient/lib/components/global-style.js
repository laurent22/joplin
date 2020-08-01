const Setting = require('lib/models/Setting.js');
const { Platform } = require('react-native');
const { themeById } = require('lib/theme');

const baseStyle = {
	appearance: 'light',
	fontSize: 16,
	noteViewerFontSize: 16,
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	fontSizeSmaller: 14,
	disabledOpacity: 0.2,
	lineHeight: '1.6em',
};

const themeCache_ = {};

function addExtraStyles(style) {
	style.marginRight = style.margin;
	style.marginLeft = style.margin;
	style.marginTop = style.margin;
	style.marginBottom = style.margin;

	style.icon = {
		color: style.color,
		fontSize: 30,
	};

	style.lineInput = {
		color: style.color,
		backgroundColor: style.backgroundColor,
		borderBottomWidth: 1,
		borderColor: style.dividerColor,
		paddingBottom: 0,
	};

	if (Platform.OS === 'ios') {
		delete style.lineInput.borderBottomWidth;
		delete style.lineInput.borderColor;
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
		color: style.urlColor,
		fontSize: style.fontSize,
	};

	style.headerStyle = {
		color: style.color,
		fontSize: style.fontSize * 1.2,
		fontWeight: 'bold',
	};

	style.headerWrapperStyle = {
		backgroundColor: style.headerBackgroundColor,
	};

	style.keyboardAppearance = style.appearance;

	return style;
}

function editorFont(fontId) {
	// IMPORTANT: The font mapping must match the one in Setting.js
	const fonts = {
		[Setting.FONT_DEFAULT]: null,
		[Setting.FONT_MENLO]: 'Menlo',
		[Setting.FONT_COURIER_NEW]: 'Courier New',
		[Setting.FONT_AVENIR]: 'Avenir',
		[Setting.FONT_MONOSPACE]: 'monospace',
	};
	if (!fontId) {
		console.warn('Editor font not set! Falling back to default font."');
		fontId = Setting.FONT_DEFAULT;
	}
	return fonts[fontId];
}

function themeStyle(theme) {
	if (!theme) {
		console.warn('Theme not set! Defaulting to Light theme.');
		theme = Setting.THEME_LIGHT;
	}

	const cacheKey = [theme].join('-');
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	const output = Object.assign({}, baseStyle, themeById(theme));
	themeCache_[cacheKey] = addExtraStyles(output);
	return themeCache_[cacheKey];
}

module.exports = { themeStyle, editorFont };
