const globalStyle = {
	margin: 15, // No text and no interactive component should be within this margin
	backgroundColor: "#ffffff",
	color: "#555555", // For regular text
	colorFaded: "#777777", // For less important text
	fontSize: 10,
	dividerColor: "#dddddd",
	selectedColor: '#e5e5e5',
	disabledOpacity: 0.3,

	raisedBackgroundColor: "#0072D5",
	raisedColor: "#003363",
	raisedHighlightedColor: "#ffffff",

	// For WebView - must correspond to the properties above
	htmlFontSize: '14px',
	htmlColor: 'black', // Note: CSS in WebView component only seem to work if the colour is written in full letters (so no hexadecimal)
	htmlDividerColor: 'Gainsboro',
};

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;
globalStyle.htmlMarginLeft = ((globalStyle.marginLeft / 10) * 0.6).toFixed(2) + 'em';

globalStyle.icon = {
	color: globalStyle.color,
	fontSize: 30,
};

globalStyle.lineInput = {
	color: globalStyle.color,
	backgroundColor: globalStyle.backgroundColor,
};

export { globalStyle }