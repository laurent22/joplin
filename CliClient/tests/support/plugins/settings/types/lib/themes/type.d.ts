export declare enum ThemeAppearance {
    Light = "light",
    Dark = "dark"
}
export interface Theme {
    appearance: ThemeAppearance;
    backgroundColor: string;
    backgroundColorTransparent: string;
    oddBackgroundColor: string;
    color: string;
    colorError: string;
    colorWarn: string;
    colorFaded: string;
    colorBright: string;
    dividerColor: string;
    selectedColor: string;
    urlColor: string;
    backgroundColor2: string;
    color2: string;
    selectedColor2: string;
    colorError2: string;
    backgroundColor3: string;
    backgroundColorHover3: string;
    color3: string;
    backgroundColor4: string;
    color4: string;
    raisedBackgroundColor: string;
    raisedColor: string;
    searchMarkerBackgroundColor: string;
    searchMarkerColor: string;
    warningBackgroundColor: string;
    tableBackgroundColor: string;
    codeBackgroundColor: string;
    codeBorderColor: string;
    codeColor: string;
    codeMirrorTheme: string;
    codeThemeCss: string;
    highlightedColor?: string;
}
