
import Editor, { EditorEventType, HTMLToolbar } from 'js-draw';
import 'js-draw/bundle';

declare namespace ReactNativeWebView {
	const postMessage: (data: any)=> void;
}

export const createJsDrawEditor = (): Editor => {
	const parentElement = document.body;
	const editor = new Editor(parentElement);

	return editor;
};

export const restoreToolbarState = (toolbar: HTMLToolbar, state: string) => {
	if (state) {
		// deserializeState throws on invalid argument.
		try {
			toolbar.deserializeState(state);
		} catch (e) {
			console.warn('Error deserializing toolbar state: ', e);
		}
	}
};

export const listenToolbarState = (editor: Editor, toolbar: HTMLToolbar) => {
	editor.notifier.on(EditorEventType.ToolUpdated, () => {
		const state = toolbar.serializeState();
		ReactNativeWebView.postMessage(
			JSON.stringify({
				action: 'save-toolbar',
				data: state,
			})
		);
	});
};

export default createJsDrawEditor;
