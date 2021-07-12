import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
const React = require('react');
const { forwardRef, useImperativeHandle, useEffect, useState, useCallback, useRef } = require('react');
const { WebView } = require('react-native-webview');

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
	initialText: string;
	style: any;
	onChange: ChangeEventHandler;
	onUndoRedoDepthChange: UndoRedoDepthChangeHandler;
}

function useHtml(): string {
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
						</style>
					</head>
					<body style="margin:0; height:100vh; width:100vh; width:100vw; min-width:100vw;">
						<div id="editor" style="height:100%;"></div>
					</body>
				</html>
			`
		);
	}, []);

	return html;
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

		// let bundle = null;
		let cm = null;

		try {
			const bundle = ${shim.injectedJs('codemirrorBundle')};
			cm = bundle.initCodeMirror(document.getElementById('editor'), ${JSON.stringify(props.initialText)});
		} catch (e) {
			window.ReactNativeWebView.postMessage("error:" + e.message + ": " + JSON.stringify(e))
		} finally {
			true;
		}
	`;

	const html = useHtml();

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
		style={{ ...props.style, borderColor: 'red', borderWidth: 1, borderStyle: 'solid' }}
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
