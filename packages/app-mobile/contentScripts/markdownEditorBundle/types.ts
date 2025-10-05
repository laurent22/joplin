import { EditorEvent } from '@joplin/editor/events';
import { ContentScriptData, EditorControl, EditorSettings, LocalizationResult } from '@joplin/editor/types';


export interface EditorProps {
	parentElementOrClassName: HTMLElement|string;
	initialText: string;
	initialNoteId: string|null;
	settings: EditorSettings;
}

export interface EditorWithParentProps extends EditorProps {
	onEvent: (editorEvent: EditorEvent)=> void;
}

// The Markdown editor exposes global functions within its <WebView>.
// These functions can be used externally.
export interface ExportedWebViewGlobals {
	createEditorWithParent: (options: EditorWithParentProps)=> EditorControl;
	createMainEditor: (props: EditorProps)=> EditorControl;
}

export interface EditorProcessApi {
	mainEditor: EditorControl;
	updateSettings: (settings: EditorSettings)=> void;
	updatePlugins: (contentScripts: ContentScriptData[])=> void;
}

export interface SelectionRange {
	start: number;
	end: number;
}

export interface MainProcessApi {
	onLocalize(text: string): LocalizationResult;
	onEditorEvent(event: EditorEvent): Promise<void>;
	onEditorAdded(): Promise<void>;
	logMessage(message: string): Promise<void>;
	onPasteFile(type: string, dataBase64: string): Promise<void>;
	onResolveImageSrc(src: string, reloadCounter: number): Promise<string|null>;
}
