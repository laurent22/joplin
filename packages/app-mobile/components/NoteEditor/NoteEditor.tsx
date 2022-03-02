import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
const React = require('react');
const { forwardRef, useImperativeHandle, useEffect, useState, useCallback, useRef } = require('react');
const { WebView } = require('react-native-webview');
const { editorFont } = require('../global-style');

export interface ChangeEvent {
	value: string;
}

export interface UndoRedoDepthChangeEvent {
	undoDepth: number;
	redoDepth: number;
}

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;

interface Props {
	themeId: number;
	initialText: string;
	style: any;
	onChange: ChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
}

function fontFamilyFromSettings() {
	const f = editorFont(Setting.value('style.editor.fontFamily'));
	return [f, 'sans-serif'].join(', ');
}

// function useCss(themeId:number):string {
// 	const [css, setCss] = useState('');

// 	// useEffect(() => {
// 	// 	const theme = themeStyle(themeId);

// 	// 	// Selection in dark mode is hard to see so make it brighter.
// 	// 	// https://discourse.joplinapp.org/t/dragging-in-dark-theme/12433/4?u=laurent
// 	// 	const selectionColorCss = theme.appearance === ThemeAppearance.Dark ?
// 	// 		`.CodeMirror-selected {
// 	// 			background: #6b6b6b !important;
// 	// 		}` : '';
// 	// 	const monospaceFonts = [];
// 	// 	// if (Setting.value('style.editor.monospaceFontFamily')) monospaceFonts.push(`"${Setting.value('style.editor.monospaceFontFamily')}"`);
// 	// 	monospaceFonts.push('monospace');

// 	// 	const fontSize = 15;
// 	// 	const fontFamily = fontFamilyFromSettings();

// 	// 	// BUG: caret-color seems to be ignored for some reason
// 	// 	const caretColor = theme.appearance === ThemeAppearance.Dark ? "white" : 'black';

// 	// 	setCss(`
// 	// 		/* These must be important to prevent the codemirror defaults from taking over*/
// 	// 		.CodeMirror {
// 	// 			font-family: ${fontFamily};
// 	// 			font-size: ${fontSize}px;
// 	// 			height: 100% !important;
// 	// 			width: 100% !important;
// 	// 			color: ${theme.color};
// 	// 			background-color: ${theme.backgroundColor};
// 	// 			position: absolute !important;
// 	// 			-webkit-box-shadow: none !important; // Some themes add a box shadow for some reason
// 	// 		}

// 	// 		.CodeMirror-lines {
// 	// 			/* This is used to enable the scroll-past end behaviour. The same height should */
// 	// 			/* be applied to the viewer. */
// 	// 			padding-bottom: 400px !important;
// 	// 		}

// 	// 		/* Left padding is applied at the editor component level, so we should remove it from the lines */
// 	// 		.CodeMirror pre.CodeMirror-line,
// 	// 		.CodeMirror pre.CodeMirror-line-like {
// 	// 			padding-left: 0;
// 	// 		}

// 	// 		.CodeMirror-sizer {
// 	// 			/* Add a fixed right padding to account for the appearance (and disappearance) */
// 	// 			/* of the sidebar */
// 	// 			padding-right: 10px !important;
// 	// 		}

// 	// 		/* This enforces monospace for certain elements (code, tables, etc.) */
// 	// 		.cm-jn-monospace {
// 	// 			font-family: ${monospaceFonts.join(', ')} !important;
// 	// 		}

// 	// 		.cm-header-1 {
// 	// 			font-size: 1.5em;
// 	// 		}

// 	// 		.cm-header-2 {
// 	// 			font-size: 1.3em;
// 	// 		}

// 	// 		.cm-header-3 {
// 	// 			font-size: 1.1em;
// 	// 		}

// 	// 		.cm-header-4, .cm-header-5, .cm-header-6 {
// 	// 			font-size: 1em;
// 	// 		}

// 	// 		.cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6 {
// 	// 			line-height: 1.5em;
// 	// 		}

// 	// 		.cm-search-marker {
// 	// 			background: ${theme.searchMarkerBackgroundColor};
// 	// 			color: ${theme.searchMarkerColor} !important;
// 	// 		}

// 	// 		.cm-search-marker-selected {
// 	// 			background: ${theme.selectedColor2};
// 	// 			color: ${theme.color2} !important;
// 	// 		}

// 	// 		.cm-search-marker-scrollbar {
// 	// 			background: ${theme.searchMarkerBackgroundColor};
// 	// 			-moz-box-sizing: border-box;
// 	// 			box-sizing: border-box;
// 	// 			opacity: .5;
// 	// 		}

// 	// 		/* We need to use important to override theme specific values */
// 	// 		.cm-error {
// 	// 			color: inherit !important;
// 	// 			background-color: inherit !important;
// 	// 			border-bottom: 1px dotted #dc322f;
// 	// 		}

// 	// 		/* The default dark theme colors don't have enough contrast with the background */
// 	// 		.cm-s-nord span.cm-comment {
// 	// 			color: #9aa4b6 !important;
// 	// 		}

// 	// 		.cm-s-dracula span.cm-comment {
// 	// 			color: #a1abc9 !important;
// 	// 		}

// 	// 		.cm-s-monokai span.cm-comment {
// 	// 			color: #908b74 !important;
// 	// 		}

// 	// 		.cm-s-material-darker span.cm-comment {
// 	// 			color: #878787 !important;
// 	// 		}

// 	// 		.cm-s-solarized.cm-s-dark span.cm-comment {
// 	// 			color: #8ba1a7 !important;
// 	// 		}

// 	// 		/* MOBILE SPECIFIC */

// 	// 		.CodeMirror .cm-scroller,
// 	// 		.CodeMirror .cm-line {
// 	// 			font-family: ${fontFamily};
// 	// 			caret-color: ${caretColor};
// 	// 		}

// 	// 		${selectionColorCss}
// 	// 	`);
// 	// }, [themeId]);

// 	return css;
// }

function useHtml(css: string): string {
	const [html, setHtml] = useState('');

	useEffect(() => {
		setHtml(
			`
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
						<style>
							.cm-editor {
								height: 100%;
							}

							${css}
						</style>
					</head>
					<body style="margin:0; height:100vh; width:100vh; width:100vw; min-width:100vw; box-sizing: border-box; padding: 10px;">
						<div class="CodeMirror" style="height:100%;" autocapitalize="on"></div>
					</body>
				</html>
			`
		);
	}, [css]);

	return html;
}

function editorTheme(themeId: number) {
	return {
		...themeStyle(themeId),
		fontSize: 15,
		fontFamily: fontFamilyFromSettings(),
	};
}

function NoteEditor(props: Props, ref: any) {
	const [source, setSource] = useState(undefined);
	const webviewRef = useRef(null);

	const injectedJavaScript = `
		function postMessage(name, data) {
			window.ReactNativeWebView.postMessage(JSON.stringify({
				data,
				name,	
			}));
		}

		function logMessage(...msg) {
			postMessage('onLog', { value: msg });
		}

		// This variable is not used within this script
		// but is called using "injectJavaScript" from
		// the wrapper component.
		let cm = null;

		try {
			${shim.injectedJs('codeMirrorBundle')};

			const parentElement = document.getElementsByClassName('CodeMirror')[0];
			const theme = ${JSON.stringify(editorTheme(props.themeId))};
			const initialText = ${JSON.stringify(props.initialText)};

			cm = codeMirrorBundle.initCodeMirror(parentElement, initialText, theme);
		} catch (e) {
			window.ReactNativeWebView.postMessage("error:" + e.message + ": " + JSON.stringify(e))
		} finally {
			true;
		}
	`;

	// const css = useCss(props.themeId);
	const html = useHtml('');

	useImperativeHandle(ref, () => {
		return {
			undo: function() {
				webviewRef.current.injectJavaScript('cm.undo(); true;');
			},
			redo: function() {
				webviewRef.current.injectJavaScript('cm.redo(); true;');
			},
		};
	});

	useEffect(() => {
		let cancelled = false;
		async function createHtmlFile() {
			const tempFile = `${Setting.value('resourceDir')}/NoteEditor.html`;
			await shim.fsDriver().writeFile(tempFile, html, 'utf8');
			if (cancelled) return;

			setSource({
				uri: `file://${tempFile}?r=${Math.round(Math.random() * 100000000)}`,
				baseUrl: `file://${Setting.value('resourceDir')}/`,
			});
		}

		void createHtmlFile();

		return () => {
			cancelled = true;
		};
	}, [html]);

	const onMessage = useCallback((event: any) => {
		const data = event.nativeEvent.data;

		if (data.indexOf('error:') === 0) {
			console.error('CodeMirror:', data);
			return;
		}

		const msg = JSON.parse(data);

		const handlers: Record<string, Function> = {
			onLog: (event: any) => {
				console.info('CodeMirror:', ...event.value);
			},

			onChange: (event: ChangeEvent) => {
				props.onChange(event);
			},

			onUndoRedoDepthChange: (event: UndoRedoDepthChangeEvent) => {
				console.info('onUndoRedoDepthChange', event);
				props.onUndoRedoDepthChange(event);
			},
		};

		if (handlers[msg.name]) {
			handlers[msg.name](msg.data);
		} else {
			console.info('Unsupported CodeMirror message:', msg);
		}
	}, [props.onChange]);

	const onError = useCallback(() => {
		console.error('NoteEditor: webview error');
	});

	// - `setSupportMultipleWindows` must be `true` for security reasons:
	//   https://github.com/react-native-webview/react-native-webview/releases/tag/v11.0.0
	return <WebView
		style={props.style}
		ref={webviewRef}
		useWebKit={true}
		source={source}
		setSupportMultipleWindows={true}
		allowingReadAccessToURL={`file://${Setting.value('resourceDir')}`}
		originWhitelist={['file://*', './*', 'http://*', 'https://*']}
		allowFileAccess={true}
		injectedJavaScript={injectedJavaScript}
		onMessage={onMessage}
		onError={onError}
	/>;
}

export default forwardRef(NoteEditor);
