import * as React from 'react';
import { useRef, useEffect } from 'react';
import useViewIsReady from './hooks/useViewIsReady';
import useThemeCss from './hooks/useThemeCss';
const styled = require('styled-components').default;

interface Props {
	html:string,
	scripts:string[],
	onMessage:Function,
	pluginId:string,
	viewId:string,
	themeId:string,
	borderBottom: boolean,
	theme?:any,
}

const StyledFrame = styled.iframe`
	padding: 0;
	margin: 0;
	width: 100%;
	height: 100%;
	border: none;
	border-bottom: ${(props:Props) => props.borderBottom ? `1px solid ${props.theme.dividerColor}` : 'none'};
`;

export default function UserWebview(props:Props) {
	const viewRef = useRef(null);
	const isReady = useViewIsReady(viewRef);
	const cssFilePath = useThemeCss({ pluginId: props.pluginId, themeId: props.themeId });

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
		if (!isReady || !cssFilePath) return;
		postMessage('setScript', { script: cssFilePath, key: 'themeCss' });
	}, [isReady, cssFilePath]);

	useEffect(() => {
		function onMessage(event:any) {
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

	return <StyledFrame
		id={props.viewId}
		ref={viewRef}
		src="gui/plugin_service/UserWebviewIndex.html"
		borderBottom={props.borderBottom}
	></StyledFrame>;
}
