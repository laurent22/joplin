// Wraps react-native-webview. Allows loading HTML directly.

const React = require('react');

import {
	forwardRef, Ref, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { WebViewErrorEvent, WebViewSource } from 'react-native-webview/lib/WebViewTypes';

import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import shim from '@joplin/lib/shim';
import { StyleProp, ViewStyle } from 'react-native';


export interface WebViewControl {
	injectJS(script: string): void;
}

type OnMessageCallback = (event: WebViewMessageEvent)=> void;
type OnErrorCallback = (event: WebViewErrorEvent)=> void;

interface Props {
	themeId: number;
	html: string;
	injectedJavaScript: string;
	style?: StyleProp<ViewStyle>;
	onMessage: OnMessageCallback;
	onError: OnErrorCallback;
}

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const editorTheme: Theme = themeStyle(props.themeId);
	const webviewRef = useRef(null);
	const [source, setSource] = useState<WebViewSource>(undefined);

	useImperativeHandle(ref, (): WebViewControl => {
		return {
			injectJS(js: string) {
				webviewRef.current.injectJavaScript(`
				try {
					${js}
				}
				catch(e) {
					logMessage('Error in injected JS:' + e, e);
					throw e;
				};

				true;`);
			},
		};
	});

	useEffect(() => {
		let cancelled = false;
		async function createHtmlFile() {
			const tempFile = `${Setting.value('resourceDir')}/NoteEditor.html`;
			await shim.fsDriver().writeFile(tempFile, props.html, 'utf8');
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
	}, [props.html]);

	// - `setSupportMultipleWindows` must be `true` for security reasons:
	//   https://github.com/react-native-webview/react-native-webview/releases/tag/v11.0.0
	// - `scrollEnabled` prevents iOS from scrolling the document (has no effect on Android)
	//    when the editor is focused.
	return (
		<WebView
			style={{
				backgroundColor: editorTheme.backgroundColor,
				...(props.style as any),
			}}
			ref={webviewRef}
			scrollEnabled={false}
			useWebKit={true}
			source={source}
			setSupportMultipleWindows={true}
			hideKeyboardAccessoryView={true}
			allowingReadAccessToURL={`file://${Setting.value('resourceDir')}`}
			originWhitelist={['file://*', './*', 'http://*', 'https://*']}
			allowFileAccess={true}
			injectedJavaScript={props.injectedJavaScript}
			onMessage={props.onMessage}
			onError={props.onError}
		/>
	);
};

export default forwardRef(ExtendedWebView);
