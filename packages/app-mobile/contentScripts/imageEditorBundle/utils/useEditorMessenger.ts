import { RefObject, useMemo, useRef } from 'react';
import Setting from '@joplin/lib/models/Setting';
import Clipboard from '@react-native-clipboard/clipboard';
import { MainProcessApi, EditorProcessApi } from '../contentScript/types';
import { WebViewControl } from '../../../components/ExtendedWebView/types';
import RNToWebViewMessenger from '../../../utils/ipc/RNToWebViewMessenger';

interface Props {
	webViewRef: RefObject<WebViewControl>;
	setImageChanged(changed: boolean): void;

	onReadyToLoadData(): void;
	onSave(data: string): void;
	onAutoSave(data: string): void;
	onRequestCloseEditor(promptIfUnsaved: boolean): void;
}

const useEditorMessenger = ({
	webViewRef: webviewRef, setImageChanged, onReadyToLoadData, onRequestCloseEditor, onSave, onAutoSave,
}: Props) => {
	const events = { onRequestCloseEditor, onSave, onAutoSave, onReadyToLoadData };
	// Use a ref to avoid unnecessary rerenders
	const eventsRef = useRef(events);
	eventsRef.current = events;

	return useMemo(() => {
		const localApi: MainProcessApi = {
			updateEditorTemplate: newTemplate => {
				Setting.setValue('imageeditor.imageTemplate', newTemplate);
			},
			updateToolbarState: newData => {
				Setting.setValue('imageeditor.jsdrawToolbar', newData);
			},
			setImageHasChanges: hasChanges => {
				setImageChanged(hasChanges);
			},
			onLoadedEditor: () => {
				eventsRef.current.onReadyToLoadData();
			},
			saveThenClose: svgData => {
				eventsRef.current.onSave(svgData);
				eventsRef.current.onRequestCloseEditor(false);
			},
			save: (svgData, isAutosave) => {
				if (isAutosave) {
					return eventsRef.current.onAutoSave(svgData);
				} else {
					return eventsRef.current.onSave(svgData);
				}
			},
			closeEditor: promptIfUnsaved => {
				eventsRef.current.onRequestCloseEditor(promptIfUnsaved);
			},
			writeClipboardText: async text => {
				Clipboard.setString(text);
			},
			readClipboardText: async () => {
				return Clipboard.getString();
			},
		};
		const messenger = new RNToWebViewMessenger<MainProcessApi, EditorProcessApi>(
			'image-editor', webviewRef, localApi,
		);
		return messenger;
	}, [webviewRef, setImageChanged]);
};

export default useEditorMessenger;
