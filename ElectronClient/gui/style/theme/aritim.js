const aritimStyle = {
	backgroundColor: '#0f141a', // Main background color
	backgroundColorTransparent: 'yellow', // 
	oddBackgroundColor: 'yellow',
	color: '#d1ccbd', // For regular text (everything except notebooks)
	colorError: 'yellow',
	colorWarn: 'yellow',
	colorFaded: '#747169', // For less important text (e.g. not selected menu in settings)
	colorBright: '#d1ccbd', // For important text; (e.g. bold)
	dividerColor: '#222d3a', // Borders, I wish I could remove them
	selectedColor: '#2b3948', // Selected note
	urlColor: '#35b4d9', // Links to external sites (e.g. in settings)

	backgroundColor2: '#141a21', // Notebooks main background
	depthColor: '#141a21',	// Notebooks background color
	color2: '#d1ccbd', // Notebook sidebar text color
	selectedColor2: '#2b3948', // Selected notebook (or settings icon in settings)
	colorError2: 'yellow',

	raisedBackgroundColor: '#2b3948', // Table, hover
	raisedColor: 'yellow',

	warningBackgroundColor: '#f06246', // Info / Warning boxes bg color

	// Markdown rendered
	htmlColor: '#d1ccbd', // Text color
	htmlBackgroundColor: '#0f141a', // BG Color
	htmlDividerColor: '#d1ccbd', // Lines e.g. ---
	htmlLinkColor: '#307dd5', // Normal links
	htmlTableBackgroundColor: '#141a21', // Table (even) background color
	htmlCodeBackgroundColor: '#0d1014', // Single line code bg
	htmlCodeBorderColor: '#0d1014', // Single line code border, and tables 
	htmlCodeColor: '#f06246', // Single line code text

	editorTheme: 'chaos',
	codeThemeCss: 'atom-one-dark-reasonable.css',

	highlightedColor: '#d1ccbd',
};

module.exports = aritimStyle;
