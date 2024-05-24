export enum ThemeAppearance {
	Light = 'light',
	Dark = 'dark',
}

export interface Theme {
	appearance: ThemeAppearance;

	// Color scheme "1" is the basic one, like used to display the note
	// content. It's basically dark gray text on white background
	backgroundColor: string;
	backgroundColorTransparent: string;
	oddBackgroundColor: string;
	color: string; // For regular text
	colorError: string;
	colorCorrect: string;
	colorWarn: string;
	colorWarnUrl: string; // For URL displayed over a warningBackgroundColor
	colorFaded: string; // For less important text
	dividerColor: string;
	selectedColor: string;
	urlColor: string;

	// Color scheme "2" is used for the sidebar. It's white text over
	// dark blue background.
	backgroundColor2: string;
	color2: string;
	selectedColor2: string;
	colorError2: string;
	colorWarn2: string; // On a darker background (eg. sidebar)
	colorWarn3: string; // On a lighter background (eg. note list)

	// Color scheme "3" is used for the config screens for example/
	// It's dark text over gray background.
	backgroundColor3: string;
	backgroundColorHover3: string;
	color3: string;

	// Color scheme "4" is used for secondary-style buttons. It makes a white
	// button with blue text.
	backgroundColor4: string;
	color4: string;

	backgroundColor5?: string;
	color5?: string;

	raisedBackgroundColor: string;
	raisedColor: string;
	searchMarkerBackgroundColor: string;
	searchMarkerColor: string;

	warningBackgroundColor: string;

	tableBackgroundColor: string;
	codeBackgroundColor: string;
	codeBorderColor: string;
	codeColor: string;

	blockQuoteOpacity: number;

	codeMirrorTheme: string;
	codeThemeCss: string;

	highlightedColor?: string;

	headerBackgroundColor: string;
	textSelectionColor: string;
	colorBright2: string;
}
