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
		console.log('RECREATE DOM', props.html)
		return new JSDOM(props.html, { runScripts: 'dangerously', resources: 'usable' });
	}, [props.html]);

	useImperativeHandle(ref, (): WebViewControl => {
		const result = {
			injectJS(js: string) {
				logger.warn('injectJS', js.substring(0, 240));

				return dom.window.eval(js);
			},
			postMessage(message: unknown) {
				logger.warn('postmessage', message);
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

			// Testing only
			get document() {
				return dom.window.document;
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
		dom.window.eval(`
			window.setWebViewApi = (api) => {
				window.ReactNativeWebView = api;
			};
		`);
		dom.window.setWebViewApi({
			postMessage: (message: unknown) => {
				logger.warn('Got message', message);
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
		logger.warn(`DOM at ${dom.window?.location?.href} is reloading.`);
		onLoadStartRef.current?.();
		onLoadEndRef.current?.();
	}, [dom]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- HACK: Allow wrapper testing logic to access the DOM.
	const additionalProps: any = { document: dom?.window?.document };
	return (
		<View style={props.style} testID={props.testID} {...additionalProps}/>
	);
};

export default forwardRef(ExtendedWebView);
