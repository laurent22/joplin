import { Theme } from './type';
import theme_dark from './dark';

const theme: Theme = {
	...theme_dark,
	backgroundColor: '#000000',
	color: '#dddddd',
	colorFaded: '#777777',
	dividerColor: '#3D444E',
	selectedColor: '#333333',
	urlColor: 'rgb(166,166,255)',
	codeColor: '#ffffff',
	raisedBackgroundColor: '#0F2051',
	raisedColor: '#788BC3',
	tableBackgroundColor: 'rgb(0, 0, 0)',
	codeBackgroundColor: 'rgb(47, 48, 49)',
	codeBorderColor: 'rgb(70, 70, 70)',
	codeThemeCss: 'atom-one-dark-reasonable.css',
};

export default theme;
