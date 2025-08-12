import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import ExtendedWebView from '../../ExtendedWebView';
import { OnMessageEvent, WebViewControl } from '../../ExtendedWebView/types';
import { clearAutosave, writeAutosave } from './autosave';
import { DialogContext } from '../../DialogManager';
import BackButtonService from '../../../services/BackButtonService';
import useWebViewSetup, { ImageEditorControl } from '../../../contentScripts/imageEditorBundle/useWebViewSetup';

const logger = Logger.create('ImageEditor');

type OnSaveCallback = (svgData: string)=> Promise<void>;
type OnCancelCallback = ()=> void;

interface Props {
	themeId: number;
	resourceFilename: string|null;
	onSave: OnSaveCallback;
	onExit: OnCancelCallback;
}


const ImageEditor = (props: Props) => {
	const webViewRef = useRef<WebViewControl|null>(null);
	const [imageChanged, setImageChanged] = useState(false);

	const editorControlRef = useRef<ImageEditorControl|null>(null);
	const dialogs = useContext(DialogContext);

	const onRequestCloseEditor = useCallback((promptIfUnsaved = true) => {
		const discardChangesAndClose = async () => {
			await clearAutosave();
			props.onExit();
		};

		if (!imageChanged || !promptIfUnsaved) {
			void discardChangesAndClose();
			return;
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
						void editorControlRef.current.saveThenExit();
					},
				},
			],
		);
	}, [dialogs, props.onExit, imageChanged]);

	useEffect(() => {
		const hardwareBackPressListener = () => {
			onRequestCloseEditor(true);
			return true;
		};
		BackButtonService.addHandler(hardwareBackPressListener);

		return () => {
			BackButtonService.removeHandler(hardwareBackPressListener);
		};
	}, [onRequestCloseEditor]);

	const { pageSetup, api: editorControl, webViewEventHandlers } = useWebViewSetup({
		webViewRef,
		themeId: props.themeId,
		onSetImageChanged: setImageChanged,
		onAutoSave: writeAutosave,
		onSave: props.onSave,
		onRequestCloseEditor,
		resourceFilename: props.resourceFilename,
	});
	editorControlRef.current = editorControl;

	const [html, setHtml] = useState('');
	useEffect(() => {
		setHtml(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="utf-8"/>
					<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>

					<style>
						${pageSetup.css}
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onError = useCallback((event: any) => {
		logger.error('ImageEditor: WebView error: ', event);
	}, []);

	const onWebViewMessage = webViewEventHandlers.onMessage;
	const onMessage = useCallback((event: OnMessageEvent) => {
		const data = event.nativeEvent.data;
		if (typeof data === 'string' && data.startsWith('error:')) {
			logger.error(data);
			return;
		}

		onWebViewMessage(event);
	}, [onWebViewMessage]);

	return (
		<ExtendedWebView
			html={html}
			injectedJavaScript={pageSetup.js}
			allowFileAccessFromJs={true}
			onMessage={onMessage}
			onLoadEnd={webViewEventHandlers.onLoadEnd}
			onError={onError}
			ref={webViewRef}
			webviewInstanceId={'image-editor-js-draw'}
		/>
	);
};

export default ImageEditor;
