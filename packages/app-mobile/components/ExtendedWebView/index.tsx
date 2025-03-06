// Wraps react-native-webview. Allows loading HTML directly.

import * as React from 'react';

import {
	forwardRef, Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import { WebView } from 'react-native-webview';
import { WebViewErrorEvent, WebViewSource } from 'react-native-webview/lib/WebViewTypes';

import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { Props, WebViewControl } from './types';

const logger = Logger.create('ExtendedWebView');

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const webviewRef = useRef(null);
	const [source, setSource] = useState<WebViewSource|undefined>(undefined);

	useImperativeHandle(ref, (): WebViewControl => {
		return {
			injectJS(js: string) {
				if (!webviewRef.current) {
					throw new Error(`ExtendedWebView(${props.webviewInstanceId}): Trying to call injectJavaScript on a WebView that isn't loaded.`);
				}

				// .injectJavaScript can be undefined when testing.
				if (!webviewRef.current.injectJavaScript) return;

				webviewRef.current.injectJavaScript(`
				try {
					${js}
				}
				catch(e) {
					(window.logMessage || console.error)('Error in injected JS:' + e, e);
					throw e;
				};

				true;`);
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			postMessage(message: any) {
				webviewRef.current.postMessage(JSON.stringify(message));
			},
		};
	}, [props.webviewInstanceId]);

	const baseDirectory = props.baseDirectory ?? Setting.value('resourceDir');
	const baseUrl = `file://${baseDirectory}`;

	useEffect(() => {
		let cancelled = false;
		async function createHtmlFile() {
			const tempFile = `${baseDirectory}/${props.webviewInstanceId}.html`;
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
		}

		if (props.html && props.html.length > 0) {
			void createHtmlFile();
		} else {
			setSource(undefined);
		}

		return () => {
			cancelled = true;
		};
	}, [props.html, props.webviewInstanceId, baseDirectory, baseUrl]);

	const onError = useCallback((event: WebViewErrorEvent) => {
		logger.error('Error', event.nativeEvent.description);
	}, []);

	const allowWebviewDebugging = useMemo(() => {
		return Setting.value('env') === 'dev' || (!!props.hasPluginScripts && Setting.value('plugins.enableWebviewDebugging'));
	}, [props.hasPluginScripts]);

	const [reloadCounter, setReloadCounter] = useState(0);
	const refreshWebViewAfterCrash = useCallback(() => {
		// Reload the WebView on crash. See https://github.com/react-native-webview/react-native-webview/issues/3524
		logger.warn('Content process lost. Reloading the webview...');
		shim.setTimeout(() => {
			setReloadCounter(counter => counter + 1);
			// Restart after a brief delay to mitigate the case where the crash is due to
			// an out-of-memory or content script bug.
		}, 250);
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
			key={`webview-${reloadCounter}`}
			style={{
				// `backgroundColor: transparent` prevents a white fhash on iOS.
				// It seems that `backgroundColor: theme.backgroundColor` does not
				// prevent the flash.
				backgroundColor: 'transparent',
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			webviewDebuggingEnabled={allowWebviewDebugging}
			injectedJavaScript={props.injectedJavaScript}
			onMessage={props.onMessage}
			onError={props.onError ?? onError}
			onLoadEnd={props.onLoadEnd}
			onContentProcessDidTerminate={refreshWebViewAfterCrash}
			onRenderProcessGone={refreshWebViewAfterCrash}
			decelerationRate='normal'
		/>
	);
};

export default forwardRef(ExtendedWebView);
