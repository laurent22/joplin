const globalStyle = {
	margin: 15, // No text and no interactive component should be within this margin
	backgroundColor: "#ffffff",
	color: "#555555",
	fontSize: 10,
	dividerColor: "#dddddd",

	// For WebView - must correspond to the properties above
	htmlFontSize: '14px',
	htmlColor: 'black', // Note: CSS in WebView component only seem to work if the colour is written in full letters (so no hexadecimal)
};

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.htmlMarginLeft = ((globalStyle.marginLeft / 10) * 0.6).toFixed(2) + 'em';

export { globalStyle }