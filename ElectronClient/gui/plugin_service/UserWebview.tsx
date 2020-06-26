import * as React from 'react';
import { useRef, useEffect, useMemo, useState } from 'react';

interface UserWebviewProps {
	style:any,
	html:string,
	scripts:string[],
	onMessage:Function,
	pluginId:string,
	controlId:string,
}

export default function UserWebview(props:UserWebviewProps) {
	const [isReady, setIsReady] = useState(false);

	const viewRef = useRef(null);

	function frameWindow() {
		if (!viewRef.current) return null;
		return viewRef.current.contentWindow;
	}

	function postMessage(name:string, args:any = null) {
		const win = frameWindow();
		if (!win) return;
		win.postMessage({ target: 'webview', name, args }, '*');
	}

	useEffect(() => {
		if (!isReady) return;
		postMessage('setHtml', { html: props.html });
	}, [props.html, isReady]);

	useEffect(() => {
		if (!isReady) return;
		postMessage('setScripts', { scripts: props.scripts });
	}, [props.scripts, isReady]);

	useEffect(() => {
		function onReady() {
			setIsReady(true);
		}

		viewRef.current.addEventListener('dom-ready', onReady);
		viewRef.current.addEventListener('load', onReady);

		return () => {
			viewRef.current.removeEventListener('dom-ready', onReady);
			viewRef.current.removeEventListener('load', onReady);
		};
	}, []);

	useEffect(() => {
		function onMessage(event:any) {
			if (!event.data || event.data.target !== 'plugin') return;
			props.onMessage({
				pluginId: props.pluginId,
				controlId: props.controlId,
				message: event.data.message,
			});
		}

		viewRef.current.contentWindow.addEventListener('message', onMessage);

		return () => {
			viewRef.current.contentWindow.removeEventListener('message', onMessage);
		};
	}, [props.onMessage, props.pluginId, props.controlId]);


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
