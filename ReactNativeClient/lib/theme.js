"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Setting = require('lib/models/Setting.js');
const Color = require('color');
const themes = {
    [Setting.THEME_LIGHT]: require('./themes/light').default,
    [Setting.THEME_DARK]: require('./themes/dark').default,
    [Setting.THEME_DRACULA]: require('./themes/dracula'),
    [Setting.THEME_SOLARIZED_LIGHT]: require('./themes/solarizedLight'),
    [Setting.THEME_SOLARIZED_DARK]: require('./themes/solarizedDark'),
    [Setting.THEME_NORD]: require('./themes/nord'),
    [Setting.THEME_ARITIM_DARK]: require('./themes/aritimDark'),
    [Setting.THEME_OLED_DARK]: require('./themes/oledDark'),
};
function themeById(themeId) {
    if (!themes[themeId])
        throw new Error(`Invalid theme ID: ${themeId}`);
    const output = Object.assign({}, themes[themeId]);
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
const globalStyle = {
    fontFamily: 'Roboto',
    margin: 15,
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
function addMissingProperties(theme) {
    if (!('backgroundColor3' in theme))
        theme.backgroundColor3 = theme.backgroundColor;
    if (!('color3' in theme))
        theme.color3 = theme.color;
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
function addExtraStyles(style) {
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
    style.icon = Object.assign({}, style.icon, { color: style.color });
    style.lineInput = Object.assign({}, style.lineInput, {
        color: style.color,
        backgroundColor: style.backgroundColor,
    });
    style.headerStyle = Object.assign({}, style.headerStyle, {
        color: style.color,
        backgroundColor: style.backgroundColor,
    });
    style.inputStyle = Object.assign({}, style.inputStyle, {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.dividerColor,
    });
    style.containerStyle = Object.assign({}, style.containerStyle, {
        color: style.color,
        backgroundColor: style.backgroundColor,
    });
    style.buttonStyle = Object.assign({}, style.buttonStyle, {
        color: style.color4,
        backgroundColor: style.backgroundColor4,
        borderColor: style.borderColor4,
        userSelect: 'none',
        cursor: 'pointer',
    });
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
    style.clickableTextStyle = Object.assign({}, style.textStyle, {
        userSelect: 'none',
    });
    style.textStyle2 = Object.assign({}, style.textStyle, { color: style.color2 });
    style.textStyleMinor = Object.assign({}, style.textStyle, {
        color: style.colorFaded,
        fontSize: style.fontSize * 0.8,
    });
    style.urlStyle = Object.assign({}, style.textStyle, {
        textDecoration: 'underline',
        color: style.urlColor,
    });
    style.h1Style = Object.assign({}, style.textStyle, {
        color: style.color,
        fontSize: style.textStyle.fontSize * 1.5,
        fontWeight: 'bold',
    });
    style.h2Style = Object.assign({}, style.textStyle, {
        color: style.color,
        fontSize: style.textStyle.fontSize * 1.3,
        fontWeight: 'bold',
    });
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
        color: 'black',
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
    style.dialogTitle = Object.assign({}, style.h1Style, { marginBottom: '1.2em' });
    style.dropdownList = Object.assign({}, style.inputStyle);
    style.colorHover = style.color;
    style.backgroundHover = `${style.selectedColor2}44`;
    // In general the highlighted color, used to highlight text or icons, should be the same as selectedColor2
    // but some times, depending on the theme, it might be too dark or too light, so it can be
    // specified directly by the theme too.
    if (!style.highlightedColor)
        style.highlightedColor = style.selectedColor2;
    return style;
}
const themeCache_ = {};
function themeStyle(theme) {
    if (!theme)
        throw new Error('Theme must be specified');
    const zoomRatio = 1; // Setting.value('style.zoom') / 100;
    const editorFontSize = Setting.value('style.editor.fontSize');
    const cacheKey = [theme, zoomRatio, editorFontSize].join('-');
    if (themeCache_[cacheKey])
        return themeCache_[cacheKey];
    // Font size are not theme specific, but they must be referenced
    // and computed here to allow them to respond to settings changes
    // without the need to restart
    const fontSizes = {
        fontSize: Math.round(12 * zoomRatio),
        toolbarIconSize: 16,
        editorFontSize: editorFontSize,
        textAreaLineHeight: Math.round(globalStyle.textAreaLineHeight * editorFontSize / 12),
    };
    fontSizes.noteViewerFontSize = Math.round(fontSizes.fontSize * 1.25);
    let output = {};
    output.zoomRatio = zoomRatio;
    // All theme are based on the light style, and just override the
    // relevant properties
    output = Object.assign({}, globalStyle, fontSizes, themes[theme]);
    output = addMissingProperties(output);
    output = addExtraStyles(output);
    themeCache_[cacheKey] = output;
    return themeCache_[cacheKey];
}
const cachedStyles_ = {
    themeId: null,
    styles: {},
};
// cacheKey must be a globally unique key, and must change whenever
// the dependencies of the style change. If the style depends only
// on the theme, a static string can be provided as a cache key.
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
module.exports = { themeStyle, buildStyle, themeById };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aGVtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ2pELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLE1BQU0sR0FBTztJQUNsQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPO0lBQ3hELENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPO0lBQ3RELENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUNwRCxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQztJQUNuRSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQztJQUNqRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDO0lBQzlDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsT0FBTyxDQUFDLHFCQUFxQixDQUFDO0lBQzNELENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztDQUN2RCxDQUFDO0FBRUYsU0FBUyxTQUFTLENBQUMsT0FBYztJQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDdEUsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7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