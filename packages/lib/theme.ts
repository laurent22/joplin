import theme_light from './themes/light';
import theme_dark from './themes/dark';
import theme_dracula from './themes/dracula';
import theme_solarizedLight from './themes/solarizedLight';
import theme_solarizedDark from './themes/solarizedDark';
import theme_nord from './themes/nord';
import theme_aritimDark from './themes/aritimDark';
import theme_oledDark from './themes/oledDark';
import Setting from './models/Setting';
import { Theme, ThemeAppearance } from './themes/type';

const Color = require('color');

const themes: Record<number, Theme> = {
	[Setting.THEME_LIGHT]: theme_light,
	[Setting.THEME_DARK]: theme_dark,
	[Setting.THEME_DRACULA]: theme_dracula,
	[Setting.THEME_SOLARIZED_LIGHT]: theme_solarizedLight,
	[Setting.THEME_SOLARIZED_DARK]: theme_solarizedDark,
	[Setting.THEME_NORD]: theme_nord,
	[Setting.THEME_ARITIM_DARK]: theme_aritimDark,
	[Setting.THEME_OLED_DARK]: theme_oledDark,
};

export function themeById(themeId: number) {
	if (!themes[themeId]) throw new Error(`Invalid theme ID: ${themeId}`);
	return { ...themes[themeId] };
}

const literal = <T extends string> (str: T): T => str;

// globalStyle should be used for properties that do not change across themes
// i.e. should not be used for colors
const globalStyle = (() => {

	const margin = 15; // No text and no interactive component should be within this margin
	const fontFamily = 'Roboto'; // 'sans-serif',
	return {
		fontFamily: fontFamily,
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
		appearance: ThemeAppearance.Light,
		mainPadding: 12,
		topRowHeight: 50,
		editorPaddingLeft: 8,

		margin: margin,
		marginRight: margin,
		marginLeft: margin,
		marginTop: margin,
		marginBottom: margin,

		icon: { fontSize: 30 },
		lineInput: {
			fontFamily,
			maxHeight: 22,
			height: 22,
			paddingLeft: 5,
		},
		headerStyle: {
			fontFamily,
		},
		inputStyle: {
			border: '1px solid',
			height: 24,
			maxHeight: 24,
			paddingLeft: 5,
			paddingRight: 5,
			boxSizing: literal('border-box'),
		},
		containerStyle: {
			overflow: literal('auto'),
			overflowY: literal('auto'),
		},
		buttonStyle: {
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
			borderRadius: 4,
		},
	};
})();

export function extraStyles(theme: Theme) {
	const zoomRatio = 1;

	const baseFontSize = Math.round(12 * zoomRatio);
	const fontSizes = {
		fontSize: baseFontSize,
		toolbarIconSize: 18,
		noteViewerFontSize: Math.round(baseFontSize * 1.25),
	};

	const bgColor4 = theme.backgroundColor4;
	const borderColor4: string = Color(theme.color).alpha(0.3);
	const iconColor = Color(theme.color).alpha(0.8);

	const backgroundColor5 = theme.backgroundColor5 ?? theme.color4;
	const backgroundColorHover5 = Color(backgroundColor5).darken(0.2).hex();
	const backgroundColorActive5 = Color(backgroundColor5).darken(0.4).hex();

	const inputStyle = {
		...globalStyle.inputStyle,
		color: theme.color,
		backgroundColor: theme.backgroundColor,
		borderColor: theme.dividerColor,
	};

	const containerStyle = {
		...globalStyle.containerStyle,
		color: theme.color,
		backgroundColor: theme.backgroundColor,
	};

	const buttonStyle = {
		...globalStyle.buttonStyle,
		color: theme.color4,
		backgroundColor: theme.backgroundColor4,
		borderColor: borderColor4,
		userSelect: literal('none'),
		// cursor: 'pointer',

	};

	const tagStyle = {
		fontSize: baseFontSize,
		fontFamily: globalStyle.fontFamily,
		paddingTop: 4,
		paddingBottom: 4,
		paddingRight: 10,
		paddingLeft: 10,
		backgroundColor: theme.backgroundColor3,
		color: theme.color3,
		display: literal('flex'),
		alignItems: literal('center'),
		justifyContent: literal('center'),
		marginRight: 8,
		borderRadius: 100,
		borderWidth: 0,
	};

	const toolbarStyle = {
		height: globalStyle.toolbarHeight,
		minWidth: globalStyle.toolbarHeight,
		display: literal('flex'),
		alignItems: literal('center'),
		paddingLeft: globalStyle.headerButtonHPadding,
		paddingRight: globalStyle.headerButtonHPadding,
		textDecoration: literal('none'),
		fontFamily: globalStyle.fontFamily,
		fontSize: baseFontSize,
		boxSizing: literal('border-box'),
		cursor: literal('default'),
		justifyContent: literal('center'),
		color: theme.color,
		whiteSpace: literal('nowrap'),
	};

	const textStyle = {
		fontFamily: globalStyle.fontFamily,
		fontSize: baseFontSize,
		lineHeight: '1.6em',
		color: theme.color,
	};

	const textStyle2 = {
		...textStyle,
		color: theme.color2,
	};

	const textStyleMinor = { ...textStyle,
		color: theme.colorFaded,
		fontSize: baseFontSize * 0.8,
	};

	const urlStyle = {
		...textStyle,
		textDecoration: literal('underline'),
		color: theme.urlColor,
	};

	const h1Style = {
		...textStyle,
		color: theme.color,
		fontSize: textStyle.fontSize * 1.5,
		fontWeight: literal('bold'),
	};

	const h2Style = {
		...textStyle,
		color: theme.color,
		fontSize: textStyle.fontSize * 1.3,
		fontWeight: literal('bold'),
	};

	return {
		zoomRatio,
		...fontSizes,
		selectedDividerColor: Color(theme.dividerColor).darken(0.2).hex(),
		iconColor,
		colorFaded2: Color(theme.color2).alpha(0.5).rgb(),
		colorHover2: Color(theme.color2).alpha(0.7).rgb(),
		colorActive2: Color(theme.color2).alpha(0.9).rgb(),

		backgroundColorHoverDim3: Color(theme.backgroundColorHover3).alpha(0.3).rgb(),
		backgroundColorActive3: Color(theme.backgroundColorHover3).alpha(0.5).rgb(),
		backgroundColorHover2: Color(theme.selectedColor2).alpha(0.4).rgb(),
		backgroundColorHover4: Color(theme.backgroundColorHover3).alpha(0.3).rgb(),
		backgroundColorActive4: Color(theme.backgroundColorHover3).alpha(0.8).rgb(),
		colorHover3: theme.color3,
		borderColor4,
		backgroundColor4: bgColor4,
		color5: theme.color5 ?? bgColor4,
		backgroundColor5,
		backgroundColorHover5,
		backgroundColorActive5,

		icon: {
			...globalStyle.icon,
			color: theme.color,
		},
		lineInput: {
			...globalStyle.lineInput,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
		},

		containerStyle,
		configScreenPadding: globalStyle.mainPadding * 2,
		noteListHeaderHeight: 26,
		noteListHeaderBorderPadding: 4,

		textStyle,
		textStyle2,
		textStyleMinor,
		clickableTextStyle: { ...textStyle, userSelect: literal('none') },
		headerStyle: {
			...globalStyle.headerStyle,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
		},
		h1Style,
		h2Style,
		urlStyle,
		inputStyle,

		toolbarStyle,
		tagStyle,
		buttonStyle,

		dialogModalLayer: {
			zIndex: 9999,
			display: literal('flex'),
			position: literal('absolute'),
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			backgroundColor: 'rgba(0,0,0,0.6)',
			alignItems: literal('flex-start'),
			justifyContent: literal('center'),
		},

		controlBox: {
			marginBottom: '1em',
			color: 'black', // This will apply for the calendar
			display: literal('flex'),
			flexDirection: literal('row'),
			alignItems: literal('center'),
		},
		controlBoxLabel: {
			marginRight: '1em',
			width: '10em',
			display: literal('inline-block'),
			fontWeight: literal('bold'),
		},
		controlBoxValue: {
			display: literal('inline-block'),
		},

		dialogBox: {
			backgroundColor: theme.backgroundColor,
			padding: 16,
			boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
			marginTop: 20,
			maxHeight: '80%',
			display: literal('flex'),
			flexDirection: literal('column'),
		},
		buttonIconStyle: {
			color: iconColor,
			marginRight: 6,
		},
		notificationBox: {
			backgroundColor: theme.warningBackgroundColor,
			display: literal('flex'),
			alignItems: literal('center'),
			padding: 10,
			fontSize: baseFontSize,
		},
		dialogTitle: { ...h1Style, marginBottom: '1.2em' },
		dropdownList: { ...inputStyle },
		colorHover: theme.color,
		backgroundHover: `${theme.selectedColor2}44`,
		// In general the highlighted color, used to highlight text or icons, should be the same as selectedColor2
		// but some times, depending on the theme, it might be too dark or too light, so it can be
		// specified directly by the theme too.
		highlightedColor: theme.highlightedColor ?? theme.selectedColor2,
	};
}

type ExtraStyles = ReturnType<typeof extraStyles>;
type GlobalStyle = typeof globalStyle;
export type ThemeStyle = Theme & ExtraStyles & GlobalStyle & { cacheKey: number };

const themeCache_: Record<string, ThemeStyle> = {};

export function themeStyle(themeId: number): ThemeStyle {
	if (!themeId) throw new Error('Theme must be specified');

	const cacheKey = themeId;
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	const output: ThemeStyle = {
		cacheKey,
		...globalStyle,
		...themes[themeId],

		// All theme are based on the light style, and just override the
		// relevant properties
		...extraStyles(themes[themeId]),
	};

	themeCache_[cacheKey] = output;
	return themeCache_[cacheKey];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const cachedStyles_: any = {
	themeId: null,
	styles: {},
};

// cacheKey must be a globally unique key, and must change whenever
// the dependencies of the style change. If the style depends only
// on the theme, a static string can be provided as a cache key.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored code from before rule was applied
type BuildStyleCallback = (style: ThemeStyle)=> any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code from before rule was applied
export function buildStyle(cacheKey: any, themeId: number, callback: BuildStyleCallback) {
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
