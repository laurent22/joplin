const React = require('react');
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { Theme, ThemeAppearance } from '@joplin/lib/themes/type';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { WebViewMessageEvent } from 'react-native-webview';
import ExtendedWebView from '../../ExtendedWebView';
import { EditorLocalization } from './types';

type OnSaveCallback = (svgData: string)=> void;
type OnCancelCallback = ()=> void;

interface Props {
	themeId: number;
	initialSVGData: string;
	onSave: OnSaveCallback;
	onCancel: OnCancelCallback;
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

	useEffect(() => {
		BackHandler.addEventListener('hardwareBackPress', () => {
			Alert.alert(
				_('Save changes?'), _('This drawing may have unsaved changes.'), [
					{
						text: _('Discard changes'),
						onPress: () => props.onCancel(),
						style: 'destructive',
					},
					{
						text: _('Save changes'),
						onPress: () => {
							// saveDrawing calls props.onSave(...) which may close the
							// editor.
							webviewRef.current.injectJS('saveDrawing();');
						},
					},
				]
			);
			return true;
		});
	}, []);

	const localization: EditorLocalization = {
		pen: _('Pen'),
		eraser: _('Eraser'),
		select: _('Select'),
		touchDrawing: _('Touch Drawing'),
		thicknessLabel: _('Thickness: '),
		colorLabel: _('Color:'),
		resizeImageToSelection: _('Resize image to selection'),
		undo: _('Undo'),
		redo: _('Redo'),

		// {} is used instead of %d here because formatting is being done within
		// the injected JS.
		loading: _('Loading {}%%...'),
		imageEditor: _('Image Editor'),
	};

	const css = useCss(editorTheme);
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

		window.saveDrawing = () => {
			const img = window.editor.toSVG();
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'save',
					data: img.outerHTML
				}),
			);
		};

		try {
			if (window.editor === undefined) {
				${shim.injectedJs('svgEditorBundle')}

				window.editor = new svgEditorBundle.SVGEditor(
					document.body,

					// Use the default rendering mode -- we can't access it while bundled
					undefined,

					${editorTheme.appearance === ThemeAppearance.Light},
					${JSON.stringify(localization)},
				);

				window.initialSVGData = ${JSON.stringify(props.initialSVGData)};
				if (initialSVGData && initialSVGData.length > 0) {
					editor.loadFromSVG(initialSVGData);
				}

				const toolbar = editor.addToolbar();
				toolbar.addActionButton(${JSON.stringify(_('Done'))}, () => {
					saveDrawing();
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
