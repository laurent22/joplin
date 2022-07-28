import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
const React = require('react');
const { forwardRef, useImperativeHandle, useEffect, useMemo, useState, useCallback, useRef } = require('react');
const { WebView } = require('react-native-webview');
const { editorFont } = require('../global-style');

export interface ChangeEvent {
	value: string;
}

export interface UndoRedoDepthChangeEvent {
	undoDepth: number;
	redoDepth: number;
}

export interface Selection {
	start: number;
	end: number;
}

export interface SelectionChangeEvent {
	selection: Selection;
}

type ChangeEventHandler = (event: ChangeEvent)=> void;
type UndoRedoDepthChangeHandler = (event: UndoRedoDepthChangeEvent)=> void;
type SelectionChangeEventHandler = (event: SelectionChangeEvent)=> void;

interface Props {
	themeId: number;
	initialText: string;
	initialSelection?: Selection;
	style: any;

	onChange: ChangeEventHandler;
	onSelectionChange: SelectionChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
}

function fontFamilyFromSettings() {
	const f = editorFont(Setting.value('style.editor.fontFamily'));
	return [f, 'sans-serif'].join(', ');
}

function useCss(themeId: number): string {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return `
			:root {
				background-color: ${theme.backgroundColor};
			}

			body {
				font-size: 13pt;
			}
		`;
	}, [themeId]);
}

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
		fontSize: 0.85, // em
		fontFamily: fontFamilyFromSettings(),
	};
}

function NoteEditor(props: Props, ref: any) {
	const [source, setSource] = useState(undefined);
	const webviewRef = useRef(null);

	const setInitialSelectionJS = props.initialSelection ? `
		cm.select(${props.initialSelection.start}, ${props.initialSelection.end});
	` : '';

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
		window.cm = null;

		try {
			${shim.injectedJs('codeMirrorBundle')};

			const parentElement = document.getElementsByClassName('CodeMirror')[0];
			const theme = ${JSON.stringify(editorTheme(props.themeId))};
			const initialText = ${JSON.stringify(props.initialText)};

			cm = codeMirrorBundle.initCodeMirror(parentElement, initialText, theme);
			${setInitialSelectionJS}

			// Fixes https://github.com/laurent22/joplin/issues/5949
			window.onresize = () => {
				cm.scrollSelectionIntoView();
			};
		} catch (e) {
			window.ReactNativeWebView.postMessage("error:" + e.message + ": " + JSON.stringify(e))
		}
		true;
	`;

	const css = useCss(props.themeId);
	const html = useHtml(css);

	useImperativeHandle(ref, () => {
		return {
			undo: function() {
				webviewRef.current.injectJavaScript('cm.undo(); true;');
			},
			redo: function() {
				webviewRef.current.injectJavaScript('cm.redo(); true;');
			},
			select: (anchor: number, head: number) => {
				webviewRef.current.injectJavaScript(
					`cm.select(${JSON.stringify(anchor)}, ${JSON.stringify(head)}); true;`
				);
			},
			insertText: (text: string) => {
				webviewRef.current.injectJavaScript(`cm.insertText(${JSON.stringify(text)}); true;`);
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

			onSelectionChange: (event: SelectionChangeEvent) => {
				props.onSelectionChange(event);
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
	// - `scrollEnabled` prevents iOS from scrolling the document (has no effect on Android)
	//    when the editor is focused.
	return <WebView
		style={props.style}
		ref={webviewRef}
		scrollEnabled={false}
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
