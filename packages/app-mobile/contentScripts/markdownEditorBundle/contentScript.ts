import { createEditor } from '@joplin/editor/CodeMirror';
import { focus } from '@joplin/lib/utils/focusHandler';
import WebViewToRNMessenger from '../../utils/ipc/WebViewToRNMessenger';
import { EditorProcessApi, EditorProps, EditorWithParentProps, ExportedWebViewGlobals, MainProcessApi } from './types';
import readFileToBase64 from '../utils/readFileToBase64';
import { EditorControl } from '@joplin/editor/types';
import { EditorEventType } from '@joplin/editor/events';
import InMemoryCache from '@joplin/renderer/InMemoryCache';

export { default as setUpLogger } from '../utils/setUpLogger';

interface ExtendedWindow extends ExportedWebViewGlobals, Window { }
declare const window: ExtendedWindow;

let mainEditor: EditorControl|null = null;
let allEditors: EditorControl[] = [];
const messenger = new WebViewToRNMessenger<EditorProcessApi, MainProcessApi>('markdownEditor', {
	get mainEditor() {
		return mainEditor;
	},
	updatePlugins(contentScripts) {
		for (const editor of allEditors) {
			void editor.setContentScripts(contentScripts);
		}
	},
	updateSettings(settings) {
		for (const editor of allEditors) {
			editor.updateSettings(settings);
		}
	},
});


export const createEditorWithParent = ({
	parentElementOrClassName,
	initialText,
	initialNoteId,
	settings,
	onEvent,
}: EditorWithParentProps) => {
	const parentElement = (() => {
		if (parentElementOrClassName instanceof HTMLElement) {
			return parentElementOrClassName;
		}
		return document.getElementsByClassName(parentElementOrClassName)[0] as HTMLElement;
	})();
	if (!parentElement) {
		throw new Error(`Unable to find parent element for editor (class name: ${JSON.stringify(parentElementOrClassName)})`);
	}

	// resolveImageSrc can be called frequently for the same image. To avoid unnecessary IPC,
	// use an InMemoryCache.
	const resolvedImageSrcCache = new InMemoryCache();

	const control = createEditor(parentElement, {
		initialText,
		initialNoteId,
		settings,
		onLocalize: messenger.remoteApi.onLocalize,

		onPasteFile: async (data) => {
			const base64 = await readFileToBase64(data);
			await messenger.remoteApi.onPasteFile(data.type, base64);
		},

		onLogMessage: message => {
			void messenger.remoteApi.logMessage(message);
		},
		onEvent: (event) => {
			onEvent(event);

			if (event.kind === EditorEventType.Remove) {
				allEditors = allEditors.filter(other => other !== control);
			}
		},
		resolveImageSrc: async (src, reloadCounter) => {
			const cacheKey = `cachedImage.${reloadCounter}.${src}`;
			const cachedValue = resolvedImageSrcCache.value(cacheKey);
			if (cachedValue) {
				return cachedValue;
			}

			const result = messenger.remoteApi.onResolveImageSrc(src, reloadCounter);
			resolvedImageSrcCache.setValue(cacheKey, result);
			return result;
		},
	});

	allEditors.push(control);
	void messenger.remoteApi.onEditorAdded();

	return control;
};

export const createMainEditor = (props: EditorProps) => {
	const control = createEditorWithParent({
		...props,
		onEvent: (event) => {
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
	const parentElement = control.editor.dom.parentElement;
	parentElement.addEventListener('click', (event) => {
		const activeElement = document.querySelector(':focus');
		if (!parentElement.contains(activeElement) && event.target === parentElement) {
			focus('initial editor focus', control);
		}
	});

	mainEditor = control;
	return control;
};

window.createEditorWithParent = createEditorWithParent;
window.createMainEditor = createMainEditor;
