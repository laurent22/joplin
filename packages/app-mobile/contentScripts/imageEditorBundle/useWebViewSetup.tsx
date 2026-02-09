import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import useEditorMessenger from './utils/useEditorMessenger';
import { WebViewControl } from '../../components/ExtendedWebView/types';
import { LocalizedStrings } from './contentScript/types';
import { SetUpResult } from '../types';


type OnSaveCallback = (svgData: string)=> Promise<void>;
type OnCancelCallback = ()=> void;

interface Props {
	themeId: number;
	resourceFilename: string|null;
	onSave: OnSaveCallback;
	onAutoSave: OnSaveCallback;
	onRequestCloseEditor: OnCancelCallback;
	onSetImageChanged: (changed: boolean)=> void;
	webViewRef: React.RefObject<WebViewControl>;
}

export interface ImageEditorControl {
	saveThenExit(): Promise<void>;
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
				overflow: hidden;
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

			${Setting.value('buildFlag.ui.disableSmallScreenIncompatibleFeatures') ? `
				/* As of December 2025, the help overlay is difficult to use on small screens
				   (slow to load, help text overlapping content in some cases). */
				.js-draw .toolbar-help-overlay-button {
					display: none;
				}

				/* As of December 2025, the pipette button is difficult to use on small screens:
				   It may not be clear that it's necessary to dismiss the tool menu in order to
				   pick a color from the screen. */
				.js-draw .color-input-container > button.pipetteButton.pipetteButton {
					display: none;
				}
			` : ''}
		`;
	}, [editorTheme]);
};

const useWebViewSetup = ({
	webViewRef,
	themeId,
	resourceFilename,
	onSetImageChanged,
	onSave,
	onAutoSave,
	onRequestCloseEditor,
}: Props): SetUpResult<ImageEditorControl> => {
	const editorTheme: Theme = themeStyle(themeId);

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
		if (window.imageEditorControl === undefined) {
			${shim.injectedJs('imageEditorBundle')}

			const messenger = imageEditorBundle.createMessenger(() => window.imageEditorControl);
			window.imageEditorControl = imageEditorBundle.createJsDrawEditor(
				messenger.remoteApi,
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
	`, [localizedStrings, appInfo]);

	const onReadyToLoadData = useCallback(async () => {
		const getInitialInjectedData = async () => {
			// On mobile, it's faster to load the image within the WebView with an XMLHttpRequest.
			// In this case, the image is loaded elsewhere.
			if (Platform.OS !== 'web') {
				return undefined;
			}

			// On web, however, this doesn't work, so the image needs to be loaded here.
			if (!resourceFilename) {
				return '';
			}
			return await shim.fsDriver().readFile(resourceFilename, 'utf-8');
		};
		// It can take some time for initialSVGData to be transferred to the WebView.
		// Thus, do so after the main content has been loaded.
		webViewRef.current.injectJS(`(async () => {
			if (window.imageEditorControl) {
				const initialSVGPath = ${JSON.stringify(resourceFilename)};
				const initialTemplateData = ${JSON.stringify(Setting.value('imageeditor.imageTemplate'))};
				const initialData = ${JSON.stringify(await getInitialInjectedData())};

				imageEditorControl.loadImageOrTemplate(initialSVGPath, initialTemplateData, initialData);
			}
		})();`);
	}, [webViewRef, resourceFilename]);

	const messenger = useEditorMessenger({
		webViewRef,
		setImageChanged: onSetImageChanged,
		onReadyToLoadData,
		onSave,
		onAutoSave,
		onRequestCloseEditor,
	});
	const messengerRef = useRef(messenger);
	messengerRef.current = messenger;

	const css = useCss(editorTheme);
	useEffect(() => {
		void messengerRef.current.remoteApi.onThemeUpdate(css);
	}, [css]);

	const editorControl = useMemo((): ImageEditorControl => {
		return {
			saveThenExit: () => messenger.remoteApi.saveThenExit(),
		};
	}, [messenger]);

	return useMemo(() => {
		return {
			pageSetup: {
				js: injectedJavaScript,
				css,
			},
			api: editorControl,
			webViewEventHandlers: {
				onLoadEnd: messenger.onWebViewLoaded,
				onMessage: messenger.onWebViewMessage,
			},
		};
	}, [editorControl, messenger, injectedJavaScript, css]);
};

export default useWebViewSetup;
