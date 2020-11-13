import * as React from 'react';
import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import useViewIsReady from './hooks/useViewIsReady';
import useThemeCss from './hooks/useThemeCss';
const styled = require('styled-components').default;

export interface Props {
	html: string;
	scripts: string[];
	onMessage: Function;
	pluginId: string;
	viewId: string;
	themeId: number;
	minWidth?: number;
	minHeight?: number;
	fitToContent?: boolean;
	borderBottom?: boolean;
	theme?: any;
}

interface Size {
	width: number;
	height: number;
}

const StyledFrame = styled.iframe`
	padding: 0;
	margin: 0;
	width: ${(props: any) => props.fitToContent ? `${props.width}px` : '100%'};
	height: ${(props: any) => props.fitToContent ? `${props.height}px` : '100%'};
	border: none;
	border-bottom: ${(props: Props) => props.borderBottom ? `1px solid ${props.theme.dividerColor}` : 'none'};
`;

function serializeForm(form: any) {
	const output: any = {};
	const formData = new FormData(form);
	for (const key of formData.keys()) {
		output[key] = formData.get(key);
	}
	return output;
}

function serializeForms(document: any) {
	const forms = document.getElementsByTagName('form');
	const output: any = {};
	let untitledIndex = 0;

	for (const form of forms) {
		const name = `${form.getAttribute('name')}` || (`form${untitledIndex++}`);
		output[name] = serializeForm(form);
	}

	return output;
}

function UserWebview(props: Props, ref: any) {
	const minWidth = props.minWidth ? props.minWidth : 200;
	const minHeight = props.minHeight ? props.minHeight : 20;

	const viewRef = useRef(null);
	const isReady = useViewIsReady(viewRef);
	const cssFilePath = useThemeCss({ pluginId: props.pluginId, themeId: props.themeId });
	const [contentSize, setContentSize] = useState<Size>({ width: minWidth, height: minHeight });

	useImperativeHandle(ref, () => {
		return {
			formData: function() {
				if (viewRef.current) {
					return serializeForms(viewRef.current.contentWindow.document);
				} else {
					return null;
				}
			},
		};
	});

	function frameWindow() {
		if (!viewRef.current) return null;
		return viewRef.current.contentWindow;
	}

	function postMessage(name: string, args: any = null) {
		const win = frameWindow();
		if (!win) return;
		win.postMessage({ target: 'webview', name, args }, '*');
	}

	function updateContentSize() {
		const win = frameWindow();
		if (!win) return null;

		const rect = win.document.getElementById('joplin-plugin-content').getBoundingClientRect();

		let w = rect.width;
		let h = rect.height;
		if (w < minWidth) w = minWidth;
		if (h < minHeight) h = minHeight;

		const newSize = { width: w, height: h };

		setContentSize((current: Size) => {
			if (current.width === newSize.width && current.height === newSize.height) return current;
			return newSize;
		});

		return newSize;
	}

	useEffect(() => {
		if (!isReady) return () => {};
		let cancelled = false;
		postMessage('setHtml', { html: props.html });

		setTimeout(() => {
			if (cancelled) return;
			updateContentSize();
		}, 100);

		return () => {
			cancelled = true;
		};
	}, [props.html, isReady]);

	useEffect(() => {
		if (!isReady) return;
		postMessage('setScripts', { scripts: props.scripts });
	}, [props.scripts, isReady]);

	useEffect(() => {
		if (!isReady || !cssFilePath) return;
		postMessage('setScript', { script: cssFilePath, key: 'themeCss' });
	}, [isReady, cssFilePath]);

	useEffect(() => {
		function onMessage(event: any) {
			if (!event.data || event.data.target !== 'plugin') return;
			props.onMessage({
				pluginId: props.pluginId,
				viewId: props.viewId,
				message: event.data.message,
			});
		}

		viewRef.current.contentWindow.addEventListener('message', onMessage);

		return () => {
			viewRef.current.contentWindow.removeEventListener('message', onMessage);
		};
	}, [props.onMessage, props.pluginId, props.viewId]);

	useEffect(() => {
		if (!props.fitToContent || !isReady) return () => {};

		// The only reliable way to make sure that the iframe has the same dimensions
		// as its content is to poll the dimensions at regular intervals. Other methods
		// work most of the time but will fail in various edge cases. Most reliable way
		// is probably iframe-resizer package, but still with 40 unfixed bugs.
		//
		// Polling in our case is fine since this is only used when displaying plugin
		// dialogs, which should be short lived. updateContentSize() is also optimised
		// to do nothing when size hasn't changed.
		const updateFrameSizeIID = setInterval(updateContentSize, 2000);

		return () => {
			clearInterval(updateFrameSizeIID);
		};
	}, [props.fitToContent, isReady, minWidth, minHeight]);

	return <StyledFrame
		id={props.viewId}
		width={contentSize.width}
		height={contentSize.height}
		fitToContent={props.fitToContent}
		ref={viewRef}
		src="services/plugins/UserWebviewIndex.html"
		borderBottom={props.borderBottom}
	></StyledFrame>;
}

export default forwardRef(UserWebview);
