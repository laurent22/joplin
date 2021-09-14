const darkBase = require('./dark');

module.exports = Object.assign({}, darkBase, {
	appearance: 'dark',
	backgroundColor: '#000000',
	color: '#dddddd',
	colorFaded: '#777777',
	dividerColor: '#3D444E',
	selectedColor: '#333333',
	urlColor: 'rgb(166,166,255)',
	codeColor: '#ffffff',
	raisedBackgroundColor: '#0F2051',
	raisedColor: '#788BC3',
	raisedHighlightedColor: '#ffffff',
	tableBackgroundColor: 'rgb(0, 0, 0)',
	codeBackgroundColor: 'rgb(47, 48, 49)',
	codeBorderColor: 'rgb(70, 70, 70)',
	codeThemeCss: 'atom-one-dark-reasonable.css',
	colorBright: 'rgb(220,220,220)',
});
