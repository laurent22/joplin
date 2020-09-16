import * as React from 'react';
import { useRef, useEffect, useMemo, useState } from 'react';
import { themeStyle } from 'lib/theme';
const { camelCaseToDash, formatCssSize } = require('lib/string-utils');
const { shim } = require('lib/shim');
const Setting = require('lib/models/Setting');

interface UserWebviewProps {
	style:any,
	html:string,
	scripts:string[],
	onMessage:Function,
	pluginId:string,
	viewId:string,
	themeId:string,
}

function themeToCssVariables(theme:any) {
	const lines = [];
	lines.push(':root {');

	for (const name in theme) {
		const value = theme[name];
		if (typeof value === 'object') continue;
		if (['appearance', 'codeThemeCss', 'codeMirrorTheme'].indexOf(name) >= 0) continue;

		const newName = `--joplin-${camelCaseToDash(name)}`;

		const formattedValue = typeof value === 'number' && newName.indexOf('opacity') < 0 ? formatCssSize(value) : value;

		lines.push(`\t${newName}: ${formattedValue};`);
	}

	lines.push('}');

	return lines.join('\n');
}

export default function UserWebview(props:UserWebviewProps) {
	const [isReady, setIsReady] = useState(false);
	const [themeCssLoaded, setThemeCssLoaded] = useState(false);
	const [cssFilePath, setCssFilePath] = useState('');

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
		if (themeCssLoaded) return () => {};

		let cancelled = false;

		async function createThemeStyleSheet() {
			const theme = themeStyle(props.themeId);
			const css = themeToCssVariables(theme);
			const filePath = `${Setting.value('tempDir')}/plugin_${props.pluginId}_theme_${props.themeId}.css`;
			await shim.fsDriver().writeFile(filePath, css, 'utf8');
			if (cancelled) return;
			setCssFilePath(filePath);
			setThemeCssLoaded(true);
		}

		createThemeStyleSheet();

		return () => {
			cancelled = true;
		};
	}, [props.pluginId, props.themeId, themeCssLoaded]);

	useEffect(() => {
		if (!isReady) return;
		postMessage('setHtml', { html: props.html });
	}, [props.html, isReady]);

	useEffect(() => {
		if (!isReady) return;
		postMessage('setScripts', { scripts: props.scripts });
	}, [props.scripts, isReady]);

	useEffect(() => {
		if (!isReady || !themeCssLoaded || !cssFilePath) return;
		postMessage('setScript', { script: cssFilePath, key: 'themeCss' });
	}, [isReady, themeCssLoaded, cssFilePath]);

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
				viewId: props.viewId,
				message: event.data.message,
			});
		}

		viewRef.current.contentWindow.addEventListener('message', onMessage);

		return () => {
			viewRef.current.contentWindow.removeEventListener('message', onMessage);
		};
	}, [props.onMessage, props.pluginId, props.viewId]);

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
