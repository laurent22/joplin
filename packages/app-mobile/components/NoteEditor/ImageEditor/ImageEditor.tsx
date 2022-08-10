const React = require('react');
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { Theme, ThemeAppearance } from '@joplin/lib/themes/type';
import { useCallback, useMemo, useRef } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import ExtendedWebView from '../../ExtendedWebView';
import { ToolbarLocalization } from './toolbar/types';

type OnSaveCallback = (svgData: string)=> void;

interface Props {
	themeId: number;
	initialSVGData: string;
	onSave: OnSaveCallback;
}

const useCss = (editorTheme: Theme) => {
	return useMemo(() => {
		return `
			:root > body {
				--primary-background-color: ${editorTheme.backgroundColor};
				--primary-background-color-transparent: ${editorTheme.backgroundColorTransparent};
				--secondary-background-color: ${editorTheme.selectedColor2};
				--primary-foreground-color: ${editorTheme.color};
				--secondary-foreground-color: ${editorTheme.color2};
			}
		`;
	}, [editorTheme]);
};

const ImageEditor = (props: Props) => {
	const editorTheme: Theme = themeStyle(props.themeId);
	const webviewRef = useRef(null);

	const css = useCss(editorTheme);

	const localization: ToolbarLocalization = {
		pen: _('Pen'),
		eraser: _('Eraser'),
		select: _('Select'),
		touchDrawing: _('Touch Drawing'),
		thicknessLabel: _('Thickness: '),
		colorLabel: _('Color:'),
		resizeImageToSelection: _('Resize image to selection'),
		undo: _('Undo'),
		redo: _('Redo'),
	};

	const html = useMemo(() => `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8"/>
				<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>

				<style>
					${css}
				</style>
			</head>
			<body></body>
		</html>
	`, [css]);

	const injectedJavaScript = useMemo(() => `
		window.onerror = (message, source, lineno) => {
			window.ReactNativeWebView.postMessage(
				"error: " + message + " in file://" + source + ", line " + lineno
			);
		};

		try {
			if (window.editor === undefined) {
				${shim.injectedJs('svgEditorBundle')}

				window.editor = new svgEditorBundle.SVGEditor(
					document.body,
					undefined,
					${editorTheme.appearance === ThemeAppearance.Light},
				);

				window.initialSVGData = ${JSON.stringify(props.initialSVGData)};
				if (initialSVGData && initialSVGData.length > 0) {
					editor.loadFromSVG(initialSVGData);
				}

				const toolbar = editor.addToolbar(${JSON.stringify(localization)});
				toolbar.addActionButton(${JSON.stringify(_('Done'))}, () => {
					const img = editor.toSVG();
					window.ReactNativeWebView.postMessage(
						JSON.stringify({
							action: 'save',
							data: img.outerHTML
						}),
					);
				});
			}
		} catch(e) {
			window.ReactNativeWebView.postMessage(
				'error: ' + e.message + ': ' + JSON.stringify(e)
			);
		}
		true;
	`, [props.initialSVGData]);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
		const data = event.nativeEvent.data;
		if (data.startsWith('error:')) {
			console.error('ImageEditor:', data);
			return;
		}

		const json = JSON.parse(data);
		if (json.action === 'save') {
			props.onSave(json.data);
		} else {
			console.error('Unknown action,', json.action);
		}
	}, [props.onSave]);

	const onError = useCallback((event: any) => {
		console.error('ImageEditor: WebView error: ', event);
	}, []);

	return (
		<ExtendedWebView
			themeId={props.themeId}
			html={html}
			injectedJavaScript={injectedJavaScript}
			onMessage={onMessage}
			onError={onError}
			ref={webviewRef}
		/>
	);
};

export default ImageEditor;
