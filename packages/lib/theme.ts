import { Theme } from './themes/type';

import theme_light from './themes/light';
import theme_dark from './themes/dark';
import theme_dracula from './themes/dracula';
import theme_solarizedLight from './themes/solarizedLight';
import theme_solarizedDark from './themes/solarizedDark';
import theme_nord from './themes/nord';
import theme_aritimDark from './themes/aritimDark';
import theme_oledDark from './themes/oledDark';
import Setting from './models/Setting';

const Color = require('color');

const themes: any = {
	[Setting.THEME_LIGHT]: theme_light,
	[Setting.THEME_DARK]: theme_dark,
	[Setting.THEME_DRACULA]: theme_dracula,
	[Setting.THEME_SOLARIZED_LIGHT]: theme_solarizedLight,
	[Setting.THEME_SOLARIZED_DARK]: theme_solarizedDark,
	[Setting.THEME_NORD]: theme_nord,
	[Setting.THEME_ARITIM_DARK]: theme_aritimDark,
	[Setting.THEME_OLED_DARK]: theme_oledDark,
};

export function themeById(themeId: string) {
	if (!themes[themeId]) throw new Error(`Invalid theme ID: ${themeId}`);
	const output = { ...themes[themeId] };

	if (!output.headerBackgroundColor) {
		output.headerBackgroundColor = output.appearance === 'light' ? '#F0F0F0' : '#2D3136';
	}

	if (!output.textSelectionColor) {
		output.textSelectionColor = output.appearance === 'light' ? '#0096FF' : '#00AEFF';
	}

	if (!output.colorBright2) {
		output.colorBright2 = output.appearance === 'light' ? '#ffffff' : '#ffffff';
	}

	return output;
}

// globalStyle should be used for properties that do not change across themes
// i.e. should not be used for colors
const globalStyle: any = {
	fontFamily: 'Roboto', // 'sans-serif',
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	disabledOpacity: 0.3,
	buttonMinWidth: 50,
	buttonMinHeight: 30,
	editorFontSize: 12,
	textAreaLineHeight: 17,
	lineHeight: '1.6em',
	headerButtonHPadding: 6,
	toolbarHeight: 26,
	toolbarPadding: 6,
	appearance: 'light',
	mainPadding: 12,
	topRowHeight: 50,
	editorPaddingLeft: 8,
};

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;

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
	// boxShadow: '0px 1px 1px rgba(0,0,0,0.3)',
	fontSize: globalStyle.fontSize,
	borderRadius: 4,
};

function addMissingProperties(theme: Theme) {
	// if (!('backgroundColor3' in theme)) theme.backgroundColor3 = theme.backgroundColor;
	// if (!('color3' in theme)) theme.color3 = theme.color;
	// if (!('selectionBackgroundColor3' in theme)) {
	// 	if (theme.appearance === 'dark') {
	// 		theme.selectionBackgroundColor3 = '#ffffff77';
	// 	} else {
	// 		theme.selectionBackgroundColor3 = '#00000077';
	// 	}
	// }
	// if (!('backgroundColorHover3' in theme)) theme.backgroundColorHover3 = Color(theme.selectionBackgroundColor3).alpha(0.5).rgb();
	// if (!('selectionBorderColor3' in theme)) theme.selectionBorderColor3 = theme.backgroundColor3;

	// TODO: pick base theme based on appearence

	// const lightTheme = themes[Setting.THEME_LIGHT];

	// for (const n in lightTheme) {
	// 	if (!(n in theme)) theme[n] = lightTheme[n];
	// }

	return theme;
}

export function addExtraStyles(style: any) {
	style.selectedDividerColor = Color(style.dividerColor).darken(0.2).hex();
	style.iconColor = Color(style.color).alpha(0.8);

	style.colorFaded2 = Color(style.color2).alpha(0.5).rgb();
	style.colorHover2 = Color(style.color2).alpha(0.7).rgb();
	style.colorActive2 = Color(style.color2).alpha(0.9).rgb();

	style.backgroundColorHoverDim3 = Color(style.backgroundColorHover3).alpha(0.3).rgb();
	style.backgroundColorActive3 = Color(style.backgroundColorHover3).alpha(0.5).rgb();

	const bgColor4 = style.backgroundColor4;

	style.backgroundColorHover2 = Color(style.selectedColor2).alpha(0.4).rgb();

	style.backgroundColorHover4 = Color(style.backgroundColorHover3).alpha(0.3).rgb();
	style.backgroundColorActive4 = Color(style.backgroundColorHover3).alpha(0.8).rgb();
	style.borderColor4 = Color(style.color).alpha(0.3);
	style.backgroundColor4 = bgColor4;

	style.color5 = bgColor4;
	style.backgroundColor5 = style.color4;
	style.backgroundColorHover5 = Color(style.backgroundColor5).darken(0.2).hex();
	style.backgroundColorActive5 = Color(style.backgroundColor5).darken(0.4).hex();

	style.configScreenPadding = style.mainPadding * 2;

	style.icon = {
		...style.icon,
		color: style.color,
	};

	style.lineInput = {
		...style.lineInput,
		color: style.color,
		backgroundColor: style.backgroundColor,
	};

	style.headerStyle = {
		...style.headerStyle,
		color: style.color,
		backgroundColor: style.backgroundColor,
	};

	style.inputStyle = {
		...style.inputStyle,
		color: style.color,
		backgroundColor: style.backgroundColor,
		borderColor: style.dividerColor,
	};

	style.containerStyle = {
		...style.containerStyle,
		color: style.color,
		backgroundColor: style.backgroundColor,
	};

	style.buttonStyle = {
		...style.buttonStyle,
		color: style.color4,
		backgroundColor: style.backgroundColor4,
		borderColor: style.borderColor4,
		userSelect: 'none',
		// cursor: 'pointer',

	};

	style.tagStyle = {
		fontSize: style.fontSize,
		fontFamily: style.fontFamily,
		paddingTop: 4,
		paddingBottom: 4,
		paddingRight: 10,
		paddingLeft: 10,
		backgroundColor: style.backgroundColor3,
		color: style.color3,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		borderRadius: 100,
		borderWidth: 0,
	};

	style.toolbarStyle = {
		height: style.toolbarHeight,
		minWidth: style.toolbarHeight,
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

	style.clickableTextStyle = { ...style.textStyle, userSelect: 'none' };

	style.textStyle2 = { ...style.textStyle,
		color: style.color2,
	};

	style.textStyleMinor = { ...style.textStyle,
		color: style.colorFaded,
		fontSize: style.fontSize * 0.8,
	};

	style.urlStyle = { ...style.textStyle,
		textDecoration: 'underline',
		color: style.urlColor,
	};

	style.h1Style = {
		...style.textStyle,
		color: style.color,
		fontSize: style.textStyle.fontSize * 1.5,
		fontWeight: 'bold',
	};

	style.h2Style = {
		...style.textStyle,
		color: style.color,
		fontSize: style.textStyle.fontSize * 1.3,
		fontWeight: 'bold',
	};

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
		maxHeight: '80%',
		display: 'flex',
		flexDirection: 'column',
	};

	style.buttonIconStyle = {
		color: style.iconColor,
		marginRight: 6,
	};

	style.notificationBox = {
		backgroundColor: style.warningBackgroundColor,
		display: 'flex',
		alignItems: 'center',
		padding: 10,
		fontSize: style.fontSize,
	};

	style.dialogTitle = { ...style.h1Style, marginBottom: '1.2em' };

	style.dropdownList = { ...style.inputStyle };

	style.colorHover = style.color;
	style.backgroundHover = `${style.selectedColor2}44`;

	// In general the highlighted color, used to highlight text or icons, should be the same as selectedColor2
	// but some times, depending on the theme, it might be too dark or too light, so it can be
	// specified directly by the theme too.
	if (!style.highlightedColor) style.highlightedColor = style.selectedColor2;

	return style;
}

const themeCache_: any = {};

export function themeStyle(themeId: number) {
	if (!themeId) throw new Error('Theme must be specified');

	const zoomRatio = 1;

	const cacheKey = themeId;
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	// Font size are not theme specific, but they must be referenced
	// and computed here to allow them to respond to settings changes
	// without the need to restart
	const fontSizes: any = {
		fontSize: Math.round(12 * zoomRatio),
		toolbarIconSize: 18,
	};

	fontSizes.noteViewerFontSize = Math.round(fontSizes.fontSize * 1.25);

	let output: any = {};
	output.zoomRatio = zoomRatio;

	// All theme are based on the light style, and just override the
	// relevant properties
	output = { ...globalStyle, ...fontSizes, ...themes[themeId] };
	output = addMissingProperties(output);
	output = addExtraStyles(output);
	output.cacheKey = cacheKey;

	themeCache_[cacheKey] = output;
	return themeCache_[cacheKey];
}

const cachedStyles_: any = {
	themeId: null,
	styles: {},
};

// cacheKey must be a globally unique key, and must change whenever
// the dependencies of the style change. If the style depends only
// on the theme, a static string can be provided as a cache key.
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export function buildStyle(cacheKey: any, themeId: number, callback: Function) {
	cacheKey = Array.isArray(cacheKey) ? cacheKey.join('_') : cacheKey;

	// We clear the cache whenever switching themes
	if (cachedStyles_.themeId !== themeId) {
		cachedStyles_.themeId = themeId;
		cachedStyles_.styles = {};
	}

	if (cachedStyles_.styles[cacheKey]) return cachedStyles_.styles[cacheKey].style;

	const s = callback(themeStyle(themeId));

	cachedStyles_.styles[cacheKey] = {
		style: s,
		timestamp: Date.now(),
	};

	return cachedStyles_.styles[cacheKey].style;
}
