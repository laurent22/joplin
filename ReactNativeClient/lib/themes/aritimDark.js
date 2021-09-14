const aritimStyle = {
	appearance: 'dark',

	backgroundColor: '#10151a', // Main background color
	backgroundColorTransparent: 'rgba(16, 21, 26, 0.9)', //
	oddBackgroundColor: '#141a21',
	color: '#d3dae3', // For regular text (everything except notebooks)
	colorError: '#9a2f2f',
	colorWarn: '#d66500',
	colorFaded: '#666a73', // For less important text (e.g. not selected menu in settings)
	colorBright: '#d3dae3', // For important text; (e.g. bold)
	dividerColor: '#141a21', // Borders, I wish I could remove them
	selectedColor: '#2b5278', // Selected note
	urlColor: '#356693', // Links to external sites (e.g. in settings)

	backgroundColor2: '#141a21', // Notebooks main background
	color2: '#d3dae3', // Notebook sidebar text color
	selectedColor2: '#10151a', // Selected notebook (or settings icon in settings)
	colorError2: '#9a2f2f',

	raisedBackgroundColor: '#2b5278', // Table, hover
	raisedColor: '#141a21',

	warningBackgroundColor: '#9a2f2f', // Info / Warning boxes bg color

	tableBackgroundColor: '#141a21', // Table (even) background color
	codeBackgroundColor: '#141a21', // Single line code bg
	codeBorderColor: '#141a21', // Single line code border, and tables
	codeColor: '#005b47', // Single line code text

	aceEditorTheme: 'chaos',
	codeMirrorTheme: 'monokai',
	codeThemeCss: 'atom-one-dark-reasonable.css',

	highlightedColor: '#d3dae3',
};

module.exports = aritimStyle;
