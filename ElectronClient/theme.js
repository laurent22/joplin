const Setting = require('lib/models/Setting.js');

const themes = {
	[Setting.THEME_LIGHT]: require('./gui/style/theme/light'),
	[Setting.THEME_DARK]: require('./gui/style/theme/dark'),
	[Setting.THEME_DRACULA]: require('./gui/style/theme/dracula'),
	[Setting.THEME_SOLARIZED_LIGHT]: require('./gui/style/theme/solarizedLight'),
	[Setting.THEME_SOLARIZED_DARK]: require('./gui/style/theme/solarizedDark'),
	[Setting.THEME_NORD]: require('./gui/style/theme/nord'),
	[Setting.THEME_ARITIM_DARK]: require('./gui/style/theme/aritimDark'),
};

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

	style.textStyleMinor = Object.assign({}, style.textStyle,
		{
			color: style.colorFaded,
			fontSize: style.fontSize * 0.8,
		},
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

	style.notificationBox = {
		backgroundColor: style.warningBackgroundColor,
		display: 'flex',
		alignItems: 'center',
		padding: 10,
		fontSize: style.fontSize,
	};

	style.dialogTitle = Object.assign({}, style.h1Style, { marginBottom: '1.2em' });

	style.dropdownList = Object.assign({}, style.inputStyle);

	style.colorHover = style.color;
	style.backgroundHover = `${style.selectedColor2}44`;

	// In general the highlighted color, used to highlight text or icons, should be the same as selectedColor2
	// but some times, depending on the theme, it might be too dark or too light, so it can be
	// specified directly by the theme too.
	if (!style.highlightedColor) style.highlightedColor = style.selectedColor2;

	return style;
}

const themeCache_ = {};

function themeStyle(theme) {
	if (!theme) throw new Error('Theme must be specified');

	const zoomRatio = 1; // Setting.value('style.zoom') / 100;
	const editorFontSize = Setting.value('style.editor.fontSize');

	const cacheKey = [theme, zoomRatio, editorFontSize].join('-');
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	// Font size are not theme specific, but they must be referenced
	// and computed here to allow them to respond to settings changes
	// without the need to restart
	const fontSizes = {
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
	output = Object.assign({}, globalStyle, fontSizes, themes[Setting.THEME_LIGHT], themes[theme]);

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
			userSelect: 'none',
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
