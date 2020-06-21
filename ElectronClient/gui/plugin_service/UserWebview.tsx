import * as React from 'react';
import { useRef, useEffect } from 'react';

interface UserWebviewProps {
	style:any,
	controller:any,
}

export default function UserWebview(props:UserWebviewProps) {
	const viewRef = useRef(null);

	// function frameWindow() {
	// 	if (!viewRef.current) return null;
	// 	return viewRef.current.contentWindow;
	// }

	// function postMessage(name:string, data:any = null) {
	// 	const win = frameWindow();
	// 	if (!win) return;
	// 	win.postMessage({ name, data }, '*');
	// }

	useEffect(() => {
		console.info('Got controller', props.controller);
	}, []);

	// useImperativeHandle(ref, () => {
	// 	return {
	// 		setHtml: function(html:string) {
	// 			postMessage('setHtml', { html });
	// 		},
	// 	};
	// });

	// useEffect(() => {
	// 	setTimeout(() => {
	// 		console.info('SEND');
	// 		postMessage('testing', {bla:"123"});
	// 	}, 1000);
	// }, []);

	return <iframe ref={viewRef} style={props.style} src="gui/plugin_service/UserWebviewIndex.html"></iframe>;
}
