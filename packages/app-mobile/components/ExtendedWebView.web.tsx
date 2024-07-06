import * as React from 'react';

import {
	forwardRef, Ref, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import { WebViewErrorEvent } from 'react-native-webview/lib/WebViewTypes';

import { StyleProp, View, ViewStyle } from 'react-native';
import makeSandboxedIframe from '@joplin/lib/utils/dom/makeSandboxedIframe';

// At present, react-native-webview doesn't support web. As such, ExtendedWebView.web.tsx
// uses an iframe when running on web.

export interface WebViewControl {
	// Evaluate the given [script] in the context of the page.
	// Unlike react-native-webview/WebView, this does not need to return true.
	injectJS(script: string): void;

	// message must be convertible to JSON
	postMessage(message: unknown): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Needs to interface with old code from before rule was applied.
type OnMessageEvent = { nativeEvent: { data: any } };

export type OnMessageCallback = (event: OnMessageEvent)=> void;
export type OnErrorCallback = (event: WebViewErrorEvent)=> void;
export type OnLoadCallback = ()=> void;

interface Props {
	// A name to be associated with the WebView (e.g. NoteEditor)
	// This name should be unique.
	webviewInstanceId: string;

	// If HTML is still being loaded, [html] should be an empty string.
	html: string;

	// Initial javascript. Must evaluate to true.
	injectedJavaScript: string;

	style?: StyleProp<ViewStyle>;
	onMessage: OnMessageCallback;
	onError?: OnErrorCallback;
	onLoadStart?: OnLoadCallback;
	onLoadEnd?: OnLoadCallback;

	// Defaults to the resource directory
	baseDirectory?: string;
}

const iframeContainerStyles = { height: '100%', width: '100%' };
const wrapperStyle: ViewStyle = { height: '100%', width: '100%', flex: 1 };

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useImperativeHandle(ref, (): WebViewControl => {
		return {
			injectJS(js: string) {
				if (!iframeRef.current) {
					console.error(`ExtendedWebView(${props.webviewInstanceId}): WebView not loaded?`);
					console.error('tried', js);
					return;
				}

				iframeRef.current.contentWindow.postMessage({
					injectJs: js,
				}, '*');
			},
			postMessage(message: unknown) {
				iframeRef.current.contentWindow.postMessage({
					postMessage: message,
				}, '*');
			},
		};
	}, [props.webviewInstanceId]);

	const [containerRef, setContainerRef] = useState<HTMLDivElement>();

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
		if (!containerRef) return () => {};

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
			allow: 'clipboard-write=(self) fullscreen=(self) autoplay=(self) local-fonts=* encrypted-media=*',
		});
		containerRef.replaceChildren(iframe);
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
		};
	}, [containerRef, props.html]);

	return (
		<View style={[wrapperStyle, props.style]}>
			<div
				ref={setContainerRef}
				className='iframe-container'
				style={iframeContainerStyles}
			></div>
		</View>
	);
};

export default forwardRef(ExtendedWebView);
