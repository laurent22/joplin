import { EditorEvent } from '@joplin/editor/events';
import { EditorControl, EditorSettings, OnLocalize } from '@joplin/editor/types';

export interface EditorProcessApi {
	editor: EditorControl;
}

export interface SelectionRange {
	start: number;
	end: number;
}

export interface EditorProps {
	parentElementClassName: string;
	initialText: string;
	initialNoteId: string;
	onLocalize: OnLocalize;
	settings: EditorSettings;
}

export interface MainProcessApi {
	onEditorEvent(event: EditorEvent): Promise<void>;
	logMessage(message: string): Promise<void>;
	onPasteFile(type: string, dataBase64: string): Promise<void>;
	onResolveImageSrc(src: string): Promise<string|null>;
}
