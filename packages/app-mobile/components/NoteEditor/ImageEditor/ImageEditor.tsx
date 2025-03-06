import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import ExtendedWebView from '../../ExtendedWebView';
import { OnMessageEvent, WebViewControl } from '../../ExtendedWebView/types';
import { clearAutosave } from './autosave';
import { LocalizedStrings } from './js-draw/types';
import { DialogContext } from '../../DialogManager';
import useEditorMessenger from './utils/useEditorMessenger';


const logger = Logger.create('ImageEditor');

type OnSaveCallback = (svgData: string)=> Promise<void>;
type OnCancelCallback = ()=> void;

interface Props {
	themeId: number;
	resourceFilename: string|null;
	onSave: OnSaveCallback;
	onExit: OnCancelCallback;
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

			/* Hide the scrollbar. See scrollbar accessibility concerns
			   (https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width#accessibility_concerns)
			   for why this isn't done in js-draw itself. */
			.toolbar-tool-row::-webkit-scrollbar {
				display: none;
				height: 0;
			}

			/* Hide the save/close icons on small screens. This isn't done in the upstream
			   js-draw repository partially because it isn't as well localized as Joplin
			   (icons can be used to suggest the meaning of a button when a translation is
			   unavailable). */
			.toolbar-edge-toolbar:not(.one-row) .toolwidget-tag--save .toolbar-icon,
			.toolbar-edge-toolbar:not(.one-row) .toolwidget-tag--exit .toolbar-icon {
				display: none;
			}
		`;
	}, [editorTheme]);
};

const ImageEditor = (props: Props) => {
	const editorTheme: Theme = themeStyle(props.themeId);
	const webviewRef: MutableRefObject<WebViewControl>|null = useRef(null);
	const [imageChanged, setImageChanged] = useState(false);

	const dialogs = useContext(DialogContext);

	const onRequestCloseEditor = useCallback((promptIfUnsaved: boolean) => {
		const discardChangesAndClose = async () => {
			await clearAutosave();
			props.onExit();
		};

		if (!imageChanged || !promptIfUnsaved) {
			void discardChangesAndClose();
			return true;
		}

		dialogs.prompt(
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
						webviewRef.current.injectJS('window.editorControl.saveThenExit()');
					},
				},
			],
		);
		return true;
	}, [webviewRef, dialogs, props.onExit, imageChanged]);

	useEffect(() => {
		const hardwareBackPressListener = () => {
			onRequestCloseEditor(true);
			return true;
		};
		BackHandler.addEventListener('hardwareBackPress', hardwareBackPressListener);

		return () => {
			BackHandler.removeEventListener('hardwareBackPress', hardwareBackPressListener);
		};
	}, [onRequestCloseEditor]);

	const css = useCss(editorTheme);
	const [html, setHtml] = useState('');

	useEffect(() => {
		setHtml(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="utf-8"/>
					<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>

					<style id='main-style'>
						${css}
					</style>
				</head>
				<body></body>
			</html>
		`);

		// Only set HTML initially (and don't reset). Changing the HTML reloads
		// the page.
		//
		// We need the HTML to initially have the correct CSS to prevent color
		// changes on load.
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps
	}, []);

	// A set of localization overrides (Joplin is better localized than js-draw).
	// All localizable strings (some unused?) can be found at
	// https://github.com/personalizedrefrigerator/js-draw/blob/main/.github/ISSUE_TEMPLATE/translation-js-draw-new.yml
	const localizedStrings: LocalizedStrings = useMemo(() => ({
		save: _('Save'),
		close: _('Close'),
		undo: _('Undo'),
		redo: _('Redo'),
	}), []);

	const appInfo = useMemo(() => {
		return {
			name: 'Joplin',
			description: `v${shim.appVersion()}`,
		};
	}, []);

	const injectedJavaScript = useMemo(() => `
		window.onerror = (message, source, lineno) => {
			window.ReactNativeWebView.postMessage(
				"error: " + message + " in file://" + source + ", line " + lineno,
			);
		};

		window.onunhandledrejection = (error) => {
			window.ReactNativeWebView.postMessage(
				"error: " + error.reason,
			);
		};

		try {
			if (window.editorControl === undefined) {
				${shim.injectedJs('svgEditorBundle')}

				window.editorControl = svgEditorBundle.createJsDrawEditor(
					svgEditorBundle.createMessenger().remoteApi,
					${JSON.stringify(Setting.value('imageeditor.jsdrawToolbar'))},
					${JSON.stringify(Setting.value('locale'))},
					${JSON.stringify(localizedStrings)},
					${JSON.stringify({
		appInfo,
		...(shim.mobilePlatform() === 'web' ? {
			// Use the browser-default clipboard API on web.
			clipboardApi: null,
		} : {}),
	})},
				);
			}
		} catch(e) {
			window.ReactNativeWebView.postMessage(
				'error: ' + e.message + ': ' + JSON.stringify(e)
			);
		}
		true;
	`, [localizedStrings, appInfo]);

	useEffect(() => {
		webviewRef.current?.injectJS(`
			document.querySelector('#main-style').textContent = ${JSON.stringify(css)};

			if (window.editorControl) {
				window.editorControl.onThemeUpdate();
			}
		`);
	}, [css]);

	const onReadyToLoadData = useCallback(async () => {
		const getInitialInjectedData = async () => {
			// On mobile, it's faster to load the image within the WebView with an XMLHttpRequest.
			// In this case, the image is loaded elsewhere.
			if (Platform.OS !== 'web') {
				return undefined;
			}

			// On web, however, this doesn't work, so the image needs to be loaded here.
			if (!props.resourceFilename) {
				return '';
			}
			return await shim.fsDriver().readFile(props.resourceFilename, 'utf-8');
		};
		// It can take some time for initialSVGData to be transferred to the WebView.
		// Thus, do so after the main content has been loaded.
		webviewRef.current.injectJS(`(async () => {
			if (window.editorControl) {
				const initialSVGPath = ${JSON.stringify(props.resourceFilename)};
				const initialTemplateData = ${JSON.stringify(Setting.value('imageeditor.imageTemplate'))};
				const initialData = ${JSON.stringify(await getInitialInjectedData())};

				editorControl.loadImageOrTemplate(initialSVGPath, initialTemplateData, initialData);
			}
		})();`);
	}, [webviewRef, props.resourceFilename]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onError = useCallback((event: any) => {
		logger.error('ImageEditor: WebView error: ', event);
	}, []);

	const messenger = useEditorMessenger({
		webviewRef,
		setImageChanged,
		onReadyToLoadData,
		onSave: props.onSave,
		onRequestCloseEditor,
	});

	const onMessage = useCallback((event: OnMessageEvent) => {
		const data = event.nativeEvent.data;
		if (typeof data === 'string' && data.startsWith('error:')) {
			logger.error(data);
			return;
		}

		messenger.onWebViewMessage(event);
	}, [messenger]);

	return (
		<ExtendedWebView
			html={html}
			injectedJavaScript={injectedJavaScript}
			allowFileAccessFromJs={true}
			onMessage={onMessage}
			onLoadEnd={messenger.onWebViewLoaded}
			onError={onError}
			ref={webviewRef}
			webviewInstanceId={'image-editor-js-draw'}
		/>
	);
};

export default ImageEditor;
