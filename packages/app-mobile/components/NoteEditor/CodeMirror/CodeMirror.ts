/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `yarn buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { EditorSettings } from '@joplin/editor/types';
import createEditor from '@joplin/editor/CodeMirror/createEditor';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { WebViewToEditorApi } from '../types';

export const initCodeMirror = (
	parentElement: HTMLElement,
	initialText: string,
	settings: EditorSettings,
): CodeMirrorControl => {
	const messenger = new WebViewToRNMessenger<CodeMirrorControl, WebViewToEditorApi>('editor', null);

	const control = createEditor(parentElement, {
		initialText,
		settings,

		onLogMessage: message => {
			void messenger.remoteApi.logMessage(message);
		},
		onEvent: (event): void => {
			void messenger.remoteApi.onEditorEvent(event);
		},
	});

	messenger.setLocalInterface(control);
	return control;
};
