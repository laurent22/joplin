/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `yarn buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it should just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { EditorSettings } from '@joplin/editor/types';
import createEditor from '@joplin/editor/CodeMirror/createEditor';
import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { WebViewToEditorApi } from '../types';
import { focus } from '@joplin/lib/utils/focusHandler';

export const initCodeMirror = (
	parentElement: HTMLElement,
	initialText: string,
	initialNoteId: string,
	settings: EditorSettings,
): CodeMirrorControl => {
	const messenger = new WebViewToRNMessenger<CodeMirrorControl, WebViewToEditorApi>('editor', null);

	const control = createEditor(parentElement, {
		initialText,
		initialNoteId,
		settings,

		onPasteFile: async (data) => {
			const reader = new FileReader();
			return new Promise<void>((resolve, reject) => {
				reader.onload = async () => {
					const dataUrl = reader.result as string;
					const base64 = dataUrl.replace(/^data:.*;base64,/, '');
					await messenger.remoteApi.onPasteFile(data.type, base64);
					resolve();
				};
				reader.onerror = () => reject(new Error('Failed to load file.'));

				reader.readAsDataURL(data);
			});
		},

		onLogMessage: message => {
			void messenger.remoteApi.logMessage(message);
		},
		onEvent: (event): void => {
			void messenger.remoteApi.onEditorEvent(event);
		},
	});

	// Works around https://github.com/laurent22/joplin/issues/10047 by handling
	// the text/uri-list MIME type when pasting, rather than sending the paste event
	// to CodeMirror.
	//
	// TODO: Remove this workaround when the issue has been fixed upstream.
	control.on('paste', (_editor, event: ClipboardEvent) => {
		const clipboardData = event.clipboardData;
		if (clipboardData.types.length === 1 && clipboardData.types[0] === 'text/uri-list') {
			event.preventDefault();
			control.insertText(clipboardData.getData('text/uri-list'));
		}
	});

	// Note: Just adding an onclick listener seems sufficient to focus the editor when its background
	// is tapped.
	parentElement.addEventListener('click', (event) => {
		const activeElement = document.querySelector(':focus');
		if (!parentElement.contains(activeElement) && event.target === parentElement) {
			focus('initial editor focus', control);
		}
	});

	messenger.setLocalInterface(control);
	return control;
};
