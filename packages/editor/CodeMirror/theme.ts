//
// Create a set of Extensions that provide syntax highlighting.
//


import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

import { inlineMathTag, mathTag } from './markdown/markdownMathParser';
import { EditorTheme } from '../types';

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
const createTheme = (theme: EditorTheme): Extension[] => {
	// If the theme hasn't loaded yet, return nothing.
	// (createTheme should be called again after the theme has loaded).
	if (!theme) {
		return [];
	}

	const isDarkTheme = theme.appearance === 'dark';

	const baseGlobalStyle: Record<string, string> = {
		color: theme.color,
		backgroundColor: theme.backgroundColor,

		// On iOS, apply system font scaling (e.g. font scaling
		// set in accessibility settings).
		font: '-apple-system-body',

		// Fill container horizontally
		width: '100%',
		boxSizing: 'border-box',
	};
	const baseCursorStyle: Record<string, string> = { };
	const baseContentStyle: Record<string, string> = {
		fontFamily: theme.fontFamily,
		fontSize: `${theme.fontSize}${theme.fontSizeUnits ?? 'px'}`,

		// Avoid using units here -- 1.55em, for example, can cause lines to overlap
		// if some lines contain text with a large enough font size.
		lineHeight: theme.isDesktop ? '1.55' : undefined,
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

	const monospaceStyle = {
		fontFamily: theme.monospaceFont || 'monospace',
	};

	// This is equivalent to the default selection style -- our styling must
	// be at least this specific.
	const selectionBackgroundSelector = '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground';

	const baseHeadingStyle = {
		fontWeight: 'bold',
		fontFamily: theme.fontFamily,
	};

	const codeMirrorTheme = EditorView.theme({
		// Include &.CodeMirror to handle the case where additional CodeMirror 5 styles
		// need to be overridden.
		'&, &.CodeMirror': baseGlobalStyle,

		// These must be !important or more specific than CodeMirror's built-ins
		'& .cm-content': {
			fontFamily: theme.fontFamily,
			...baseContentStyle,
			paddingBottom: theme.isDesktop ? '400px' : undefined,
			marginLeft: `${theme.marginLeft}px`,
			marginRight: `${theme.marginRight}px`,
		},
		'&.cm-focused .cm-cursor': baseCursorStyle,

		// The desktop app sets the font for these elements to a specific font.
		// Override this.
		'& div, & span, & a': {
			fontFamily: 'inherit',
		},

		// Override the default border around CodeMirror panels
		'& > .cm-panels': {
			border: 'none',
		},

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

			...monospaceStyle,
		},

		// CodeMirror wraps the existing inline span in an additional element.
		// Due to a Chrome rendering bug, because the .cm-inlineCode wraps a
		// span with a larger font-size, the .cm-inlineCode's bounding box won't
		// be big enough for its content.
		// As such, we need to style whichever element directly wraps its content.
		'& .cm-inlineCode': {
			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: isDarkTheme ? 'rgba(200, 200, 200, 0.5)' : 'rgba(100, 100, 100, 0.5)',
			borderRadius: '4px',

			...monospaceStyle,
		},

		'& .cm-mathBlock, & .cm-inlineMath': {
			color: isDarkTheme ? '#9fa' : '#276',
		},

		'& .cm-tableHeader, & .cm-tableRow, & .cm-tableDelimiter': monospaceStyle,
		'& .cm-taskMarker': monospaceStyle,

		// Apply maximum width styles to individual lines.
		'& .cm-line': theme.contentMaxWidth ? {
			maxWidth: theme.contentMaxWidth,

			// Center
			marginLeft: 'auto',
			marginRight: 'auto',
		} : undefined,

		// Override the default URL style when the URL is within a link
		'& .tok-url.tok-link, & .tok-link.tok-meta, & .tok-link.tok-string': {
			opacity: 0.6,
		},

		// Applying font size changes with CSS rather than the theme below works
		// around an issue where the border for code blocks in headings was too
		// small.
		'& .cm-h1': {
			...baseHeadingStyle,
			fontSize: '1.6em',
		},
		'& .cm-h2': {
			...baseHeadingStyle,
			fontSize: '1.4em',
		},
		'& .cm-h3': {
			...baseHeadingStyle,
			fontSize: '1.3em',
		},
		'& .cm-h4': {
			...baseHeadingStyle,
			fontSize: '1.2em',
		},
		'& .cm-h5': {
			...baseHeadingStyle,
			fontSize: '1.1em',
		},
		'& .cm-h6': {
			...baseHeadingStyle,
			fontSize: '1.0em',
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
		{
			tag: tags.inserted,
			color: isDarkTheme ? '#7f7' : '#471',
		},
		{
			tag: tags.deleted,
			color: isDarkTheme ? '#f96' : '#a21',
		},
		{
			tag: tags.propertyName,
			color: isDarkTheme ? '#d96' : '#940',
		},
		{
			// CSS class names (and class names in other languages)
			tag: tags.className,
			color: isDarkTheme ? '#d8a' : '#904',
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
