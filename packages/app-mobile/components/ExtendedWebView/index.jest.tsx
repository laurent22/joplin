import * as React from 'react';

import {
	forwardRef, Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef,
} from 'react';

import { View } from 'react-native';
import Logger from '@joplin/utils/Logger';
import { Props, WebViewControl } from './types';
import { JSDOM } from 'jsdom';
import useCss from './utils/useCss';

const logger = Logger.create('ExtendedWebView');

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const dom = useMemo(() => {
		// Note: Adding `runScripts: 'dangerously'` to allow running inline <script></script>s.
		// Use with caution -- don't load untrusted WebView HTML while testing.
		return new JSDOM(props.html, { runScripts: 'dangerously', pretendToBeVisual: true });
	}, [props.html]);

	const injectJs = useCallback((js: string) => {
		return dom.window.eval(js);
	}, [dom]);

	useImperativeHandle(ref, (): WebViewControl => {
		const result = {
			injectJS: injectJs,
			postMessage(message: unknown) {
				const messageEventContent = {
					data: message,
					source: 'react-native',
				};
				return dom.window.eval(`
					window.dispatchEvent(
						new MessageEvent('message', ${JSON.stringify(messageEventContent)}),
					);
				`);
			},
		};
		return result;
	}, [dom, injectJs]);

	const onMessageRef = useRef(props.onMessage);
	onMessageRef.current = props.onMessage;

	const { injectedJs: cssInjectedJavaScript } = useCss(
		injectJs,
		props.css,
	);

	// Don't re-load when injected JS changes. This should match the behavior of the native webview.
	const injectedJavaScriptRef = useRef(props.injectedJavaScript);
	injectedJavaScriptRef.current = props.injectedJavaScript + cssInjectedJavaScript;

	useEffect(() => {
		// JSDOM polyfills
		dom.window.eval(`
			window.scrollBy = (_amount) => { };

			// JSDOM iframes are missing certain functionality required by Joplin,
			// including:
			// - MessageEvent.source: Should point to the window that created a message.
			//   Joplin uses this to determine the source of messages in iframe-related IPC.
			// - iframe.srcdoc: Used by Joplin to create plugin windows.
			const polyfillIframeContentWindow = (contentWindow) => {
				contentWindow.addEventListener('message', event => {
					// Work around a missing ".source" property on events.
					// See https://github.com/jsdom/jsdom/issues/2745#issuecomment-1207414024
					if (!event.source) {
						contentWindow.dispatchEvent(new MessageEvent('message', {
							source: window,
							data: event.data,
						}));
						event.stopImmediatePropagation();
					}
				});

				contentWindow.parent.postMessage = (message) => {
					window.dispatchEvent(new MessageEvent('message', {
						data: message,
						source: contentWindow,
					}));
				};
			};

			Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {
				set(value) {
					this.src = 'about:blank';
					setTimeout(() => {
						this.contentDocument.write(value);

						polyfillIframeContentWindow(this.contentWindow);
					}, 0);
				},
			});
		`);

		dom.window.eval(`
			window.setWebViewApi = (api) => {
				window.ReactNativeWebView = api;
			};
		`);
		dom.window.setWebViewApi({
			postMessage: (message: unknown) => {
				logger.debug('Got message', message);
				onMessageRef.current({ nativeEvent: { data: message } });
			},
		});

		// Wrap the injected JavaScript in (() => {...})() to more closely
		// match the behavior of injectedJavaScript on Android -- variables
		// declared with "var" or "const" should not become global variables.
		dom.window.eval(`(() => {
			${injectedJavaScriptRef.current}
		})()`);
	}, [dom]);

	const onLoadEndRef = useRef(props.onLoadEnd);
	onLoadEndRef.current = props.onLoadEnd;
	const onLoadStartRef = useRef(props.onLoadStart);
	onLoadStartRef.current = props.onLoadStart;

	useEffect(() => {
		logger.debug(`DOM at ${dom.window?.location?.href} is reloading.`);
		onLoadStartRef.current?.();
		onLoadEndRef.current?.();
	}, [dom]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- HACK: Allow wrapper testing logic to access the DOM.
	const additionalProps: any = { window: dom?.window };
	return (
		<View style={props.style} testID={props.testID} {...additionalProps}/>
	);
};

export default forwardRef(ExtendedWebView);
