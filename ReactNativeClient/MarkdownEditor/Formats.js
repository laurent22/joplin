import applyWrapFormat from './applyWrapFormat';
import applyWrapFormatNewLines from './applyWrapFormatNewLines';
import applyListFormat from './applyListFormat';
import applyWebLinkFormat from './applyWebLinkFormat';

export default [
	{ key: 'B', title: 'B', wrapper: '**', onPress: applyWrapFormat, style: { fontWeight: 'bold' } },
	{ key: 'I', title: 'I', wrapper: '*', onPress: applyWrapFormat, style: { fontStyle: 'italic' } },
	{ key: 'Link', title: 'Link', onPress: applyWebLinkFormat },
	{ key: 'List', title: 'List', prefix: '-', onPress: applyListFormat },
	{
		key: 'S',
		title: 'S',
		wrapper: '~~',
		onPress: applyWrapFormat,
		style: { textDecorationLine: 'line-through' },
	},
	{ key: '</>', title: '</>', wrapper: '`', onPress: applyWrapFormat },
	{ key: 'Pre', title: 'Pre', wrapper: '```', onPress: applyWrapFormatNewLines },
	{ key: 'H1', title: 'H1', prefix: '#', onPress: applyListFormat },
	{ key: 'H2', title: 'H2', prefix: '##', onPress: applyListFormat },
	{ key: 'H3', title: 'H3', prefix: '###', onPress: applyListFormat },
];
