// Wraps react-native-webview. Allows loading HTML directly.

import * as React from 'react';

import {
	forwardRef, Ref, useCallback, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { WebViewErrorEvent, WebViewEvent, WebViewSource } from 'react-native-webview/lib/WebViewTypes';

import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import shim from '@joplin/lib/shim';
import { StyleProp, ViewStyle } from 'react-native';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('ExtendedWebView');

export interface WebViewControl {
	// Evaluate the given [script] in the context of the page.
	// Unlike react-native-webview/WebView, this does not need to return true.
	injectJS(script: string): void;

	// message must be JSON-ifyable
	postMessage(message: any): void;
}

interface SourceFileUpdateEvent {
	uri: string;
	baseUrl: string;

	filePath: string;
}

export type OnMessageCallback = (event: WebViewMessageEvent)=> void;
export type OnErrorCallback = (event: WebViewErrorEvent)=> void;
export type OnLoadCallback = (event: WebViewEvent)=> void;
type OnFileUpdateCallback = (event: SourceFileUpdateEvent)=> void;

interface Props {
	themeId: number;

	// A name to be associated with the WebView (e.g. NoteEditor)
	// This name should be unique.
	webviewInstanceId: string;

	// If HTML is still being loaded, [html] should be an empty string.
	html: string;

	// Allow a secure origin to load content from any other origin.
	// Defaults to 'never'.
	// See react-native-webview's prop with the same name.
	mixedContentMode?: 'never' | 'always';

	allowFileAccessFromJs?: boolean;

	// Initial javascript. Must evaluate to true.
	injectedJavaScript: string;

	// iOS only: Scroll the outer content of the view. Set this to `false` if
	// the main view container doesn't scroll.
	scrollEnabled?: boolean;

	style?: StyleProp<ViewStyle>;
	onMessage: OnMessageCallback;
	onError?: OnErrorCallback;
	onLoadEnd?: OnLoadCallback;

	// Triggered when the file containing [html] is overwritten with new content.
	onFileUpdate?: OnFileUpdateCallback;

	// Defaults to the resource directory
	baseUrl?: string;
}

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const theme: Theme = themeStyle(props.themeId);
	const webviewRef = useRef(null);
	const [source, setSource] = useState<WebViewSource|undefined>(undefined);

	useImperativeHandle(ref, (): WebViewControl => {
		return {
			injectJS(js: string) {
				webviewRef.current.injectJavaScript(`
				try {
					${js}
				}
				catch(e) {
					(window.logMessage || console.log)('Error in injected JS:' + e, e);
					throw e;
				};

				true;`);
			},
			postMessage(message: any) {
				webviewRef.current.postMessage(JSON.stringify(message));
			},
		};
	});

	const baseUrl = props.baseUrl ?? `file://${Setting.value('resourceDir')}/`;

	useEffect(() => {
		let cancelled = false;
		async function createHtmlFile() {
			const tempFile = `${Setting.value('resourceDir')}/${props.webviewInstanceId}.html`;
			await shim.fsDriver().writeFile(tempFile, props.html, 'utf8');
			if (cancelled) return;

			// Now that we are sending back a file instead of an HTML string, we're always sending back the
			// same file. So we add a cache busting query parameter to it, to make sure that the WebView re-renders.
			//
			// `baseUrl` is where the images will be loaded from. So images must use a path relative to resourceDir.
			const newSource = {
				uri: `file://${tempFile}?r=${Math.round(Math.random() * 100000000)}`,
				baseUrl,
			};
			setSource(newSource);

			props.onFileUpdate?.({
				...newSource,
				filePath: tempFile,
			});
		}

		if (props.html && props.html.length > 0) {
			void createHtmlFile();
		} else {
			setSource(undefined);
		}

		return () => {
			cancelled = true;
		};
	}, [props.html, props.webviewInstanceId, props.onFileUpdate, baseUrl]);

	const onError = useCallback((event: WebViewErrorEvent) => {
		logger.error('Error', event.nativeEvent.description);
	}, []);

	// - `setSupportMultipleWindows` must be `true` for security reasons:
	//   https://github.com/react-native-webview/react-native-webview/releases/tag/v11.0.0

	// 2023-06-10: When the source is falsy, we set it to `{ uri: undefined }`
	// to avoid various crashes and errors:
	// https://github.com/react-native-webview/react-native-webview/issues/2920
	// https://github.com/react-native-webview/react-native-webview/issues/2995
	//
	// decelerationRate='normal' is necessary on iOS for a native-like inertial scroll
	// (the default deaccelerates too quickly).
	return (
		<WebView
			style={{
				backgroundColor: theme.backgroundColor,
				...(props.style as any),
			}}
			ref={webviewRef}
			scrollEnabled={props.scrollEnabled}
			useWebKit={true}
			source={source ? source : { uri: undefined }}
			setSupportMultipleWindows={true}
			hideKeyboardAccessoryView={true}
			allowingReadAccessToURL={baseUrl}
			originWhitelist={['file://*', 'about:srcdoc', './*', 'http://*', 'https://*']}
			mixedContentMode={props.mixedContentMode}
			allowFileAccess={true}
			allowFileAccessFromFileURLs={props.allowFileAccessFromJs}
			webviewDebuggingEnabled={Setting.value('env') === 'dev'}
			injectedJavaScript={props.injectedJavaScript}
			onMessage={props.onMessage}
			onError={props.onError ?? onError}
			onLoadEnd={props.onLoadEnd}
			decelerationRate='normal'
		/>
	);
};

export default forwardRef(ExtendedWebView);
