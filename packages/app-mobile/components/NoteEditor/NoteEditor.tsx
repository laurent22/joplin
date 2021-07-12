import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
const React = require('react');
const { useEffect, useState, useCallback } = require('react');
const { WebView } = require('react-native-webview');

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

					</head>
					<body style="margin:0;">
						<div id="editor"></div>
					</body>
				</html>
			`
		);
	}, []);

	return html;
}

export default function() {
	const [source, setSource] = useState(undefined);

	const injectedJavaScript = `
		try {
			const codemirrorBundle = ${shim.injectedJs('codemirrorBundle')};
			codemirrorBundle.initCodeMirror(document.getElementById('editor'));
		} catch (e) {
			window.ReactNativeWebView.postMessage("error:" + e.message + ": " + JSON.stringify(e))
		} finally {
			true;
		}
	`;

	const html = useHtml();

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
		const msg = event.nativeEvent.data;
		console.info('Got IPC message: ', msg);
	});

	const onError = useCallback(() => {
		console.error('NoteEditor: webview error');
	});

	// - `setSupportMultipleWindows` must be `true` for security reasons:
	//   https://github.com/react-native-webview/react-native-webview/releases/tag/v11.0.0
	return <WebView
		style={{ flex: 1 }}
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
