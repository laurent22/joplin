//
// Create a set of Extensions that provide syntax highlighting.
//


import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

import { inlineMathTag, mathTag } from './markdownMathParser';

// For an example on how to customize the theme, see:
//
// https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
//
// For a tutorial, see:
//
// https://codemirror.net/6/examples/styling/#themes
//
// Use Safari developer tools to view the content of the CodeMirror iframe while
// the app is running. It seems that what appears as ".ͼ1" in the CSS is the
// equivalent of "&" in the theme object. So to target ".ͼ1.cm-focused", you'd
// use '&.cm-focused' in the theme.
//
// [theme] should be a joplin theme (see @joplin/lib/theme)
const createTheme = (theme: any): Extension[] => {
	const isDarkTheme = theme.appearance === 'dark';

	const baseGlobalStyle: Record<string, string> = {
		color: theme.color,
		backgroundColor: theme.backgroundColor,

		// On iOS, apply system font scaling (e.g. font scaling
		// set in accessibility settings).
		font: '-apple-system-body',
	};
	const baseCursorStyle: Record<string, string> = { };
	const baseContentStyle: Record<string, string> = {
		fontFamily: theme.fontFamily,
		fontSize: `${theme.fontSize}${theme.fontSizeUnits ?? 'px'}`,
	};
	const baseSelectionStyle: Record<string, string> = { };
	const blurredSelectionStyle: Record<string, string> = { };

	// If we're in dark mode, the caret and selection are difficult to see.
	// Adjust them appropriately
	if (isDarkTheme) {
		// Styling the caret requires styling both the caret itself
		// and the CodeMirror caret.
		// See https://codemirror.net/6/examples/styling/#themes
		baseContentStyle.caretColor = 'white';
		baseCursorStyle.borderLeftColor = 'white';

		baseSelectionStyle.backgroundColor = '#6b6b6b';
		blurredSelectionStyle.backgroundColor = '#444';
	}

	// This is equivalent to the default selection style -- our styling must
	// be at least this specific.
	const selectionBackgroundSelector = '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground';

	const codeMirrorTheme = EditorView.theme({
		'&': baseGlobalStyle,

		// These must be !important or more specific than CodeMirror's built-ins
		'.cm-content': {
			fontFamily: theme.fontFamily,
			...baseContentStyle,
		},
		'&.cm-focused .cm-cursor': baseCursorStyle,

		// &.cm-focused is used to give these styles higher specificity
		// than the defaults.
		[selectionBackgroundSelector]: baseSelectionStyle,
		'&.cm-focused ::selection': baseSelectionStyle,
		'& ::selection': blurredSelectionStyle,
		'& .cm-selectionLayer .cm-selectionBackground': blurredSelectionStyle,

		'&.cm-editor.cm-focused': {
			outline: 'none !important',
		},

		'& .cm-blockQuote': {
			borderLeft: `4px solid ${theme.colorFaded}`,
			opacity: theme.blockQuoteOpacity,
			paddingLeft: '4px',
		},

		'& .cm-codeBlock': {
			'&.cm-regionFirstLine, &.cm-regionLastLine': {
				borderRadius: '3px',
			},
			'&:not(.cm-regionFirstLine)': {
				borderTop: 'none',
				borderTopLeftRadius: 0,
				borderTopRightRadius: 0,
			},
			'&:not(.cm-regionLastLine)': {
				borderBottom: 'none',
				borderBottomLeftRadius: 0,
				borderBottomRightRadius: 0,
			},

			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: theme.colorFaded,
			backgroundColor: 'rgba(155, 155, 155, 0.1)',
		},

		// CodeMirror wraps the existing inline span in an additional element.
		// Due to a Chrome rendering bug, because the .cm-inlineCode wraps a
		// span with a larger font-size, the .cm-inlineCode's bounding box won't
		// be big enough for its content.
		// As such, we need to style whichever element directly wraps its content.
		'& .cm-headerLine > .cm-inlineCode > *, & :not(.cm-headerLine) > .cm-inlineCode': {
			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: isDarkTheme ? 'rgba(200, 200, 200, 0.5)' : 'rgba(100, 100, 100, 0.5)',
			borderRadius: '4px',
		},

		'& .cm-mathBlock, & .cm-inlineMath': {
			color: isDarkTheme ? '#9fa' : '#276',
		},


		// Style the search widget. Use ':root' to increase the selector's precedence
		// (override the existing preset styles).
		':root & .cm-panel.cm-search': {
			'& label, & button, & input': {
				fontSize: '1em',
				color: isDarkTheme ? 'white' : 'black',
			},
		},
	}, { dark: isDarkTheme });

	const baseHeadingStyle = {
		fontWeight: 'bold',
		fontFamily: theme.fontFamily,
	};

	const highlightingStyle = HighlightStyle.define([
		{
			tag: tags.strong,
			fontWeight: 'bold',
		},
		{
			tag: tags.emphasis,
			fontStyle: 'italic',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading1,
			fontSize: '1.6em',
			borderBottom: `1px solid ${theme.dividerColor}`,
		},
		{
			...baseHeadingStyle,
			tag: tags.heading2,
			fontSize: '1.4em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading3,
			fontSize: '1.3em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading4,
			fontSize: '1.2em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading5,
			fontSize: '1.1em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading6,
			fontSize: '1.0em',
		},
		{
			tag: tags.list,
			fontFamily: theme.fontFamily,
		},
		{
			tag: tags.comment,
			opacity: 0.9,
			fontStyle: 'italic',
		},
		{
			tag: tags.link,
			color: theme.urlColor,
			textDecoration: 'underline',
		},
		{
			tag: [mathTag, inlineMathTag],
			fontStyle: 'italic',
		},

		// Content of code blocks
		{
			tag: tags.keyword,
			color: isDarkTheme ? '#ff7' : '#740',
		},
		{
			tag: tags.operator,
			color: isDarkTheme ? '#f7f' : '#805',
		},
		{
			tag: tags.literal,
			color: isDarkTheme ? '#aaf' : '#037',
		},
		{
			tag: tags.operator,
			color: isDarkTheme ? '#fa9' : '#490',
		},
		{
			tag: tags.typeName,
			color: isDarkTheme ? '#7ff' : '#a00',
		},
	]);

	return [
		codeMirrorTheme,
		syntaxHighlighting(highlightingStyle),

		// If we haven't defined highlighting for tags, fall back
		// to the default.
		syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	];
};


export default createTheme;
