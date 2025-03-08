import { RefObject, useMemo } from 'react';
import { WebViewControl } from '../../../ExtendedWebView/types';
import { ImageEditorCallbacks, ImageEditorControl } from '../js-draw/types';
import Setting from '@joplin/lib/models/Setting';
import RNToWebViewMessenger from '../../../../utils/ipc/RNToWebViewMessenger';
import { writeAutosave } from '../autosave';
import Clipboard from '@react-native-clipboard/clipboard';

interface Props {
	webviewRef: RefObject<WebViewControl>;
	setImageChanged(changed: boolean): void;

	onReadyToLoadData(): void;
	onSave(data: string): void;
	onRequestCloseEditor(promptIfUnsaved: boolean): void;
}

const useEditorMessenger = ({
	webviewRef, setImageChanged, onReadyToLoadData, onRequestCloseEditor, onSave,
}: Props) => {
	return useMemo(() => {
		const localApi: ImageEditorCallbacks = {
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
				onReadyToLoadData();
			},
			saveThenClose: svgData => {
				onSave(svgData);
				onRequestCloseEditor(false);
			},
			save: (svgData, isAutosave) => {
				if (isAutosave) {
					return writeAutosave(svgData);
				} else {
					return onSave(svgData);
				}
			},
			closeEditor: promptIfUnsaved => {
				onRequestCloseEditor(promptIfUnsaved);
			},
			writeClipboardText: async text => {
				Clipboard.setString(text);
			},
			readClipboardText: async () => {
				return Clipboard.getString();
			},
		};
		const messenger = new RNToWebViewMessenger<ImageEditorCallbacks, ImageEditorControl>(
			'image-editor', webviewRef, localApi,
		);
		return messenger;
	}, [webviewRef, setImageChanged, onReadyToLoadData, onRequestCloseEditor, onSave]);
};

export default useEditorMessenger;
