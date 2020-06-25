import * as React from 'react';
import { useRef, useEffect, useMemo } from 'react';

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

	const style = useMemo(() => {
		return {
			padding: 0,
			margin: 0,
			border: 'none',
			...props.style,
		};
	}, [props.style]);

	return <iframe ref={viewRef} style={style} src="gui/plugin_service/UserWebviewIndex.html"></iframe>;
}
