import * as React from 'react';

import {
	forwardRef, Ref, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import { Props, WebViewControl } from './types';

import { View, ViewStyle } from 'react-native';
import makeSandboxedIframe from '@joplin/lib/utils/dom/makeSandboxedIframe';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('ExtendedWebView');

// At present, react-native-webview doesn't support web. As such, ExtendedWebView.web.tsx
// uses an iframe when running on web.

const iframeContainerStyles = { height: '100%', width: '100%' };
const wrapperStyle: ViewStyle = { height: '100%', width: '100%', flex: 1 };

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const iframeRef = useRef<HTMLIFrameElement|null>(null);

	useImperativeHandle(ref, (): WebViewControl => {
		return {
			injectJS(js: string) {
				if (!iframeRef.current) {
					logger.warn(`WebView(${props.webviewInstanceId}): Tried to inject JavaScript after the iframe has unloaded.`);
					return;
				}

				// react-native-webview doesn't seem to show a warning in the case where JavaScript
				// is injected before the first page loads.
				if (!iframeRef.current.contentWindow) {
					return;
				}

				iframeRef.current.contentWindow.postMessage({
					injectJs: js,
				}, '*');
			},
			postMessage(message: unknown) {
				if (!iframeRef.current || !iframeRef.current.contentWindow) {
					logger.warn(`WebView(${props.webviewInstanceId}): Tried to post a message to an unloaded iframe.`);
					return;
				}

				iframeRef.current.contentWindow.postMessage({
					postMessage: message,
				}, '*');
			},
		};
	}, [props.webviewInstanceId]);

	const [containerElement, setContainerElement] = useState<HTMLDivElement>();
	const containerRef = useRef(containerElement);
	containerRef.current = containerElement;

	const onMessageRef = useRef(props.onMessage);
	onMessageRef.current = props.onMessage;
	const onLoadEndRef = useRef(props.onLoadEnd);
	onLoadEndRef.current = props.onLoadEnd;
	const onLoadStartRef = useRef(props.onLoadStart);
	onLoadStartRef.current = props.onLoadStart;

	// Don't re-load when injected JS changes. This should match the behavior of the native webview.
	const injectedJavaScriptRef = useRef(props.injectedJavaScript);
	injectedJavaScriptRef.current = props.injectedJavaScript;

	useEffect(() => {
		const headHtml = `
			<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
			<meta charset="utf-8"/>
			<!-- Open links in a new window by default -->
			<base target="_blank"/>
		`;

		const scripts = [
			`
				window.ReactNativeWebView = {
					postMessage: (message) => {
						parent.postMessage(message, '*');
					},
					supportsNonStringMessages: true,
				};

				window.addEventListener('message', (event) => {
					if (event.source !== parent || event.origin === 'react-native') {
						return;
					}

					if (event.data.postMessage) {
						window.dispatchEvent(
							new MessageEvent(
								'message',
								{
									data: event.data.postMessage,
									origin: 'react-native'
								},
							),
						);
					} else if (event.data.injectJs) {
						eval('(() => { ' + event.data.injectJs + ' })()');
					}
				});
			`,
			injectedJavaScriptRef.current,
		];

		const { iframe } = makeSandboxedIframe({
			bodyHtml: props.html,
			headHtml: headHtml,
			scripts,

			// allow-popups-to-escape-sandbox: Allows PDF previews to work on target="_blank" links.
			// allow-popups: Allows links to open in a new tab.
			permissions: 'allow-scripts allow-modals allow-popups allow-popups-to-escape-sandbox',
			allow: 'clipboard-write; clipboard-read; fullscreen \'self\'; autoplay \'self\'; local-fonts \'self\'; encrypted-media \'self\'',
		});

		if (containerRef.current) {
			containerRef.current.replaceChildren(iframe);
		}

		iframeRef.current = iframe;

		iframe.style.height = '100%';
		iframe.style.width = '100%';
		iframe.style.border = 'none';

		const messageListener = (event: MessageEvent) => {
			if (event.source !== iframe.contentWindow) {
				return;
			}

			onMessageRef.current?.({ nativeEvent: { data: event.data } });
		};
		window.addEventListener('message', messageListener);
		if (!iframe.loading) {
			onLoadStartRef.current?.();
			onLoadEndRef.current?.();
		} else {
			iframe.onload = () => onLoadEndRef.current?.();
			iframe.onloadstart = () => onLoadStartRef.current?.();
		}

		return () => {
			window.removeEventListener('message', messageListener);

			if (iframeRef.current.parentElement) {
				iframeRef.current.remove();
			}
			iframeRef.current = null;
		};
	}, [props.html]);

	useEffect(() => {
		if (!iframeRef.current || !containerElement) return;
		if (iframeRef.current.parentElement) {
			iframeRef.current.remove();
		}

		containerElement.replaceChildren(iframeRef.current);
	}, [containerElement]);

	return (
		<View style={[wrapperStyle, props.style]}>
			<div
				ref={setContainerElement}
				className='iframe-container'
				style={iframeContainerStyles}
			></div>
		</View>
	);
};

export default forwardRef(ExtendedWebView);
