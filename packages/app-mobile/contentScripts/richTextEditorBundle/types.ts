import { EditorEvent } from '@joplin/editor/events';
import { EditorControl, EditorSettings, OnLocalize, SearchState } from '@joplin/editor/types';
import { MarkupRecord, RendererControl } from '../rendererBundle/types';
import { RenderResult } from '@joplin/renderer/types';

type SelectionRange = { start: number; end: number };

export interface EditorProps {
	initialText: string;
	initialSearch: SearchState;
	initialSelection: SelectionRange;
	initialScroll: number;
	initialNoteId: string;
	parentElementClassName: string;
	settings: EditorSettings;
}

export interface EditorProcessApi {
	editor: EditorControl;
}

type RenderOptionsSlice = {
	pluginAssetContainerSelector: string;
	splitted: boolean;
	mapsToLine: true;
	removeUnusedPluginAssets: boolean;
};

export interface MainProcessApi {
	onEditorEvent(event: EditorEvent): Promise<void>;
	logMessage(message: string): Promise<void>;
	onRender(markup: MarkupRecord, options: RenderOptionsSlice): Promise<RenderResult>;
	onPasteFile(type: string, base64: string): Promise<void>;
	onLocalize: OnLocalize;
}

export interface RichTextEditorControl {
	editor: EditorControl;
	renderer: RendererControl;
}
