import * as React from 'react';

import {
	forwardRef, Ref, useEffect, useImperativeHandle, useMemo, useRef,
} from 'react';

import { View } from 'react-native';
import Logger from '@joplin/utils/Logger';
import { Props, WebViewControl } from './types';
import { JSDOM } from 'jsdom';

const logger = Logger.create('ExtendedWebView');

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>) => {
	const dom = useMemo(() => {
		// Note: Adding `runScripts: 'dangerously'` to allow running inline <script></script>s.
		// Use with caution.
		return new JSDOM(props.html, { runScripts: 'dangerously', pretendToBeVisual: true });
	}, [props.html]);

	useImperativeHandle(ref, (): WebViewControl => {
		const result = {
			injectJS(js: string) {
				return dom.window.eval(js);
			},
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
	}, [dom]);

	const onMessageRef = useRef(props.onMessage);
	onMessageRef.current = props.onMessage;

	// Don't re-load when injected JS changes. This should match the behavior of the native webview.
	const injectedJavaScriptRef = useRef(props.injectedJavaScript);
	injectedJavaScriptRef.current = props.injectedJavaScript;

	useEffect(() => {
		// JSDOM polyfills
		dom.window.eval(`
			// Prevents the CodeMirror error "getClientRects is undefined".
			// See https://github.com/jsdom/jsdom/issues/3002#issue-652790925
			document.createRange = () => {
				const range = new Range();
				range.getBoundingClientRect = () => {};
				range.getClientRects = () => {
					return {
						length: 0,
						item: () => null,
						[Symbol.iterator]: () => {},
					};
				};

				return range;
			};
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

		dom.window.eval(injectedJavaScriptRef.current);
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
