import * as React from 'react';
import { useRef, useEffect } from 'react';

interface UserWebviewProps {
	style:any,
	html:string,
}

export default function UserWebview(props:UserWebviewProps) {
	const viewRef = useRef(null);

	function frameWindow() {
		if (!viewRef.current) return null;
		return viewRef.current.contentWindow;
	}

	function postMessage(name:string, args:any = null) {
		const win = frameWindow();
		if (!win) return;
		win.postMessage({ name, args }, '*');
	}

	useEffect(() => {
		if (!viewRef.current) return () => {};

		function onReady() {
			postMessage('setHtml', { html: props.html });
		}

		viewRef.current.addEventListener('dom-ready', onReady);
		viewRef.current.addEventListener('load', onReady);

		return () => {
			viewRef.current.removeEventListener('dom-ready', onReady);
			viewRef.current.removeEventListener('load', onReady);
		};
	}, [viewRef.current]);

	return <iframe ref={viewRef} style={props.style} src="gui/plugin_service/UserWebviewIndex.html"></iframe>;
}
