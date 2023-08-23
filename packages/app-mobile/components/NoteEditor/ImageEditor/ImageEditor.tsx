const React = require('react');
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { WebViewMessageEvent } from 'react-native-webview';
import ExtendedWebView, { WebViewControl } from '../../ExtendedWebView';
import { clearAutosave, writeAutosave } from './autosave';

const logger = Logger.create('ImageEditor');

type OnSaveCallback = (svgData: string)=> void;
type OnCancelCallback = ()=> void;
type LoadInitialSVGCallback = ()=> Promise<string>;

interface Props {
	themeId: number;
	loadInitialSVGData: LoadInitialSVGCallback|null;
	onSave: OnSaveCallback;
	onCancel: OnCancelCallback;
}

const useCss = (editorTheme: Theme) => {
	return useMemo(() => {
		// Ensure we have contrast between the background and selection. Some themes
		// have the same backgroundColor and selectionColor2. (E.g. Aritim Dark)
		let selectionBackgroundColor = editorTheme.selectedColor2;
		if (selectionBackgroundColor === editorTheme.backgroundColor) {
			selectionBackgroundColor = editorTheme.selectedColor;
		}

		return `
			:root .imageEditorContainer {
				--background-color-1: ${editorTheme.backgroundColor};
				--foreground-color-1: ${editorTheme.color};
				--background-color-2: ${editorTheme.backgroundColor3};
				--foreground-color-2: ${editorTheme.color3};
				--background-color-3: ${editorTheme.raisedBackgroundColor};
				--foreground-color-3: ${editorTheme.raisedColor};
			
				--selection-background-color: ${editorTheme.backgroundColorHover3};
				--selection-foreground-color: ${editorTheme.color3};
				--primary-action-foreground-color: ${editorTheme.color4};

				--primary-shadow-color: ${editorTheme.colorFaded};

				width: 100vw;
				height: 100vh;
				box-sizing: border-box;
			}

			body, html {
				padding: 0;
				margin: 0;
			}
		`;
	}, [editorTheme]);
};

const ImageEditor = (props: Props) => {
	const editorTheme: Theme = themeStyle(props.themeId);
	const webviewRef: MutableRefObject<WebViewControl>|null = useRef(null);
	const [imageChanged, setImageChanged] = useState(false);

	const onRequestCloseEditor = useCallback(() => {
		const discardChangesAndClose = async () => {
			await clearAutosave();
			props.onCancel();
		};

		if (!imageChanged) {
			void discardChangesAndClose();
			return true;
		}

		Alert.alert(
			_('Save changes?'), _('This drawing may have unsaved changes.'), [
				{
					text: _('Discard changes'),
					onPress: discardChangesAndClose,
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
			],
		);
		return true;
	}, [webviewRef, props.onCancel, imageChanged]);

	useEffect(() => {
		BackHandler.addEventListener('hardwareBackPress', onRequestCloseEditor);

		return () => {
			BackHandler.removeEventListener('hardwareBackPress', onRequestCloseEditor);
		};
	}, [onRequestCloseEditor]);

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

		const setImageHasChanges = (hasChanges) => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'set-image-has-changes',
					data: hasChanges,
				}),
			);
		};

		window.updateEditorTemplate = (templateData) => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'set-image-template-data',
					data: templateData,
				}),
			);
		};

		const notifyReadyToLoadSVG = () => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'ready-to-load-data',
				})
			);
		};

		const saveDrawing = (isAutosave) => {
			const img = window.editor.toSVG();
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: isAutosave ? 'autosave' : 'save',
					data: img.outerHTML,
				}),
			);
		};
		window.saveDrawing = saveDrawing;

		const closeEditor = () => {
			window.ReactNativeWebView.postMessage('{ "action": "close" }');
		};

		try {
			if (window.editor === undefined) {
				${shim.injectedJs('svgEditorBundle')}

				window.editor = svgEditorBundle.createJsDrawEditor(
					{
						saveDrawing: () => saveDrawing(false),
						autosaveDrawing: () => saveDrawing(true),
						closeEditor,
						updateEditorTemplate,
						setImageHasChanges,
					},
					${JSON.stringify(Setting.value('imageeditor.jsdrawToolbar'))},
					${JSON.stringify(Setting.value('locale'))},
				);

				editor.showLoadingWarning(0);

				// Start loading the SVG file (if present) after loading the editor.
				// This shows the user that progress is being made (loading large SVGs
				// from disk into memory can take several seconds).
				notifyReadyToLoadSVG();
			}
		} catch(e) {
			window.ReactNativeWebView.postMessage(
				'error: ' + e.message + ': ' + JSON.stringify(e)
			);
		}
		true;
	`, []);

	useEffect(() => {
		webviewRef.current?.injectJS(`
			if (window.editor) {
				svgEditorBundle.onEditorThemeUpdate(window.editor);
			}
		`);
	}, [editorTheme]);

	const onReadyToLoadData = useCallback(async () => {
		const initialSVGData = await props.loadInitialSVGData?.() ?? '';

		// It can take some time for initialSVGData to be transferred to the WebView.
		// Thus, do so after the main content has been loaded.
		webviewRef.current.injectJS(`(async () => {
			if (window.editor) {
				// loadFromSVG shows its own loading message. Hide the original.
				editor.hideLoadingWarning();

				const initialSVGData = ${JSON.stringify(initialSVGData)};
				const initialTemplateData = ${JSON.stringify(Setting.value('imageeditor.imageTemplate'))};

				if (initialSVGData && initialSVGData.length > 0) {
					await editor.loadFromSVG(initialSVGData);
				} else {
					svgEditorBundle.applyTemplateToEditor(editor, initialTemplateData);
				}

				// Only watch for changes to the image size, etc after we've loaded an image.
				svgEditorBundle.watchTemplateChanges(editor, initialTemplateData, window.updateEditorTemplate);
			}
		})();`);
	}, [webviewRef, props.loadInitialSVGData]);

	const onMessage = useCallback(async (event: WebViewMessageEvent) => {
		const data = event.nativeEvent.data;
		if (data.startsWith('error:')) {
			logger.error('ImageEditor:', data);
			return;
		}

		const json = JSON.parse(data);
		if (json.action === 'save') {
			await clearAutosave();
			props.onSave(json.data);
		} else if (json.action === 'autosave') {
			await writeAutosave(json.data);
		} else if (json.action === 'save-toolbar') {
			Setting.setValue('imageeditor.jsdrawToolbar', json.data);
		} else if (json.action === 'close') {
			onRequestCloseEditor();
		} else if (json.action === 'ready-to-load-data') {
			void onReadyToLoadData();
		} else if (json.action === 'set-image-has-changes') {
			setImageChanged(json.data);
		} else if (json.action === 'set-image-template-data') {
			Setting.setValue('imageeditor.imageTemplate', json.data);
		} else {
			logger.error('Unknown action,', json.action);
		}
	}, [props.onSave, onRequestCloseEditor, onReadyToLoadData]);

	const onError = useCallback((event: any) => {
		logger.error('ImageEditor: WebView error: ', event);
	}, []);

	return (
		<ExtendedWebView
			themeId={props.themeId}
			html={html}
			injectedJavaScript={injectedJavaScript}
			onMessage={onMessage}
			onError={onError}
			ref={webviewRef}
			webviewInstanceId={'image-editor-js-draw'}
		/>
	);
};

export default ImageEditor;
