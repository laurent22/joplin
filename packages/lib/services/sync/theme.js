"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDerivedColors = void 0;
exports.themeById = themeById;
exports.extraStyles = extraStyles;
exports.themeStyle = themeStyle;
exports.buildStyle = buildStyle;
const light_1 = require("./themes/light");
const dark_1 = require("./themes/dark");
const dracula_1 = require("./themes/dracula");
const solarizedLight_1 = require("./themes/solarizedLight");
const solarizedDark_1 = require("./themes/solarizedDark");
const nord_1 = require("./themes/nord");
const aritimDark_1 = require("./themes/aritimDark");
const oledDark_1 = require("./themes/oledDark");
const Setting_1 = require("./models/Setting");
const type_1 = require("./themes/type");
const Color = require('color');
const themes = {
    [Setting_1.default.THEME_LIGHT]: light_1.default,
    [Setting_1.default.THEME_DARK]: dark_1.default,
    [Setting_1.default.THEME_DRACULA]: dracula_1.default,
    [Setting_1.default.THEME_SOLARIZED_LIGHT]: solarizedLight_1.default,
    [Setting_1.default.THEME_SOLARIZED_DARK]: solarizedDark_1.default,
    [Setting_1.default.THEME_NORD]: nord_1.default,
    [Setting_1.default.THEME_ARITIM_DARK]: aritimDark_1.default,
    [Setting_1.default.THEME_OLED_DARK]: oledDark_1.default,
};
function themeById(themeId) {
    if (!themes[themeId])
        throw new Error(`Invalid theme ID: ${themeId}`);
    return Object.assign({}, themes[themeId]);
}
const literal = (str) => str;
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
        appearance: type_1.ThemeAppearance.Light,
        mainPadding: 12,
        topRowHeight: 50,
        editorPaddingLeft: 8,
        listTabSize: '1.7em',
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
const withDerivedColors = (theme) => {
    var _a, _b;
    const backgroundColor5 = (_a = theme.backgroundColor5) !== null && _a !== void 0 ? _a : theme.color4;
    const backgroundColor4 = theme.backgroundColor4;
    // Colors need to be converted to string to work in some cases (in particular
    // on mobile)
    const rgbString = (color) => color.rgb().string();
    const hexString = (color) => color.hex();
    return Object.assign(Object.assign({}, theme), { borderColor4: rgbString(Color(theme.color).alpha(0.3)), iconColor: rgbString(Color(theme.color).alpha(0.8)), focusOutlineColor: theme.colorWarn, backgroundColor5, backgroundColorHover5: hexString(Color(backgroundColor5).darken(0.2)), backgroundColorActive5: hexString(Color(backgroundColor5).darken(0.4)), colorFaded2: rgbString(Color(theme.color2).alpha(0.52)), colorHover2: rgbString(Color(theme.color2).alpha(0.7)), colorActive2: rgbString(Color(theme.color2).alpha(0.9)), backgroundColorHoverDim3: rgbString(Color(theme.backgroundColorHover3).alpha(0.3)), backgroundColorActive3: rgbString(Color(theme.backgroundColorHover3).alpha(0.5)), backgroundColorHover2: rgbString(Color(theme.selectedColor2).alpha(0.4)), backgroundColorHover4: rgbString(Color(theme.backgroundColorHover3).alpha(0.3)), backgroundColorActive4: rgbString(Color(theme.backgroundColorHover3).alpha(0.8)), scrollbarThumbColor: rgbString(Color(theme.color).alpha(0.54)), scrollbarThumbColorHover: rgbString(Color(theme.color).alpha(0.63)), scrollbarThumbColor2: rgbString(Color(theme.color2).alpha(0.46)), scrollbarThumbColorHover2: rgbString(Color(theme.color2).alpha(0.63)), selectedDividerColor: hexString(Color(theme.dividerColor).darken(0.2)), color5: (_b = theme.color5) !== null && _b !== void 0 ? _b : backgroundColor4, colorHover3: theme.color3 });
};
exports.withDerivedColors = withDerivedColors;
function extraStyles(theme) {
    var _a;
    const zoomRatio = 1;
    const baseFontSize = Math.round(12 * zoomRatio);
    const fontSizes = {
        fontSize: baseFontSize,
        toolbarIconSize: 18,
        noteViewerFontSize: Math.round(baseFontSize * 1.25),
    };
    const inputStyle = Object.assign(Object.assign({}, globalStyle.inputStyle), { color: theme.color, backgroundColor: theme.backgroundColor, borderColor: theme.dividerColor });
    const containerStyle = Object.assign(Object.assign({}, globalStyle.containerStyle), { color: theme.color, backgroundColor: theme.backgroundColor });
    const buttonStyle = Object.assign(Object.assign({}, globalStyle.buttonStyle), { color: theme.color4, backgroundColor: theme.backgroundColor4, borderColor: theme.borderColor4, userSelect: literal('none') });
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
    const textStyle2 = Object.assign(Object.assign({}, textStyle), { color: theme.color2 });
    const textStyleMinor = Object.assign(Object.assign({}, textStyle), { color: theme.colorFaded, fontSize: baseFontSize * 0.8 });
    const urlStyle = Object.assign(Object.assign({}, textStyle), { textDecoration: literal('underline'), color: theme.urlColor });
    const h1Style = Object.assign(Object.assign({}, textStyle), { color: theme.color, fontSize: textStyle.fontSize * 1.5, fontWeight: literal('bold') });
    const h2Style = Object.assign(Object.assign({}, textStyle), { color: theme.color, fontSize: textStyle.fontSize * 1.3, fontWeight: literal('bold') });
    return Object.assign(Object.assign({ zoomRatio }, fontSizes), { icon: Object.assign(Object.assign({}, globalStyle.icon), { color: theme.color }), lineInput: Object.assign(Object.assign({}, globalStyle.lineInput), { color: theme.color, backgroundColor: theme.backgroundColor }), containerStyle, configScreenPadding: globalStyle.mainPadding * 2, noteListHeaderHeight: 26, noteListHeaderBorderPadding: 4, textStyle,
        textStyle2,
        textStyleMinor, clickableTextStyle: Object.assign(Object.assign({}, textStyle), { userSelect: literal('none') }), headerStyle: Object.assign(Object.assign({}, globalStyle.headerStyle), { color: theme.color, backgroundColor: theme.backgroundColor }), h1Style,
        h2Style,
        urlStyle,
        inputStyle,
        toolbarStyle,
        tagStyle,
        buttonStyle, dialogModalLayer: {
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
        }, controlBox: {
            marginBottom: '1em',
            color: 'black', // This will apply for the calendar
            display: literal('flex'),
            flexDirection: literal('row'),
            alignItems: literal('center'),
        }, controlBoxLabel: {
            marginRight: '1em',
            width: '10em',
            display: literal('inline-block'),
            fontWeight: literal('bold'),
        }, controlBoxValue: {
            display: literal('inline-block'),
        }, dialogBox: {
            backgroundColor: theme.backgroundColor,
            padding: 16,
            boxShadow: '6px 6px 20px rgba(0,0,0,0.5)',
            marginTop: 20,
            maxHeight: '80%',
            display: literal('flex'),
            flexDirection: literal('column'),
        }, buttonIconStyle: {
            color: theme.iconColor,
            marginRight: 6,
        }, notificationBox: {
            backgroundColor: theme.warningBackgroundColor,
            display: literal('flex'),
            alignItems: literal('center'),
            padding: 10,
            fontSize: baseFontSize,
        }, dialogTitle: Object.assign(Object.assign({}, h1Style), { marginBottom: '1.2em' }), dropdownList: Object.assign({}, inputStyle), colorHover: theme.color, backgroundHover: `${theme.selectedColor2}44`, 
        // In general the highlighted color, used to highlight text or icons, should be the same as selectedColor2
        // but some times, depending on the theme, it might be too dark or too light, so it can be
        // specified directly by the theme too.
        highlightedColor: (_a = theme.highlightedColor) !== null && _a !== void 0 ? _a : theme.selectedColor2, markHighlightColor: theme.searchMarkerColor, markHighlightBackgroundColor: theme.searchMarkerBackgroundColor });
}
const themeCache_ = {};
function themeStyle(themeId) {
    if (!themeId)
        throw new Error('Theme must be specified');
    const cacheKey = themeId;
    if (themeCache_[cacheKey])
        return themeCache_[cacheKey];
    const theme = (0, exports.withDerivedColors)(themes[themeId]);
    const output = Object.assign(Object.assign(Object.assign({ cacheKey }, globalStyle), theme), extraStyles(theme));
    themeCache_[cacheKey] = output;
    return themeCache_[cacheKey];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const cachedStyles_ = {
    themeId: null,
    styles: {},
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code from before rule was applied
function buildStyle(cacheKey, themeId, callback) {
    cacheKey = Array.isArray(cacheKey) ? cacheKey.join('_') : cacheKey;
    // We clear the cache whenever switching themes
    if (cachedStyles_.themeId !== themeId) {
        cachedStyles_.themeId = themeId;
        cachedStyles_.styles = {};
    }
    if (cachedStyles_.styles[cacheKey])
        return cachedStyles_.styles[cacheKey].style;
    const s = callback(themeStyle(themeId));
    cachedStyles_.styles[cacheKey] = {
        style: s,
        timestamp: Date.now(),
    };
    return cachedStyles_.styles[cacheKey].style;
}
