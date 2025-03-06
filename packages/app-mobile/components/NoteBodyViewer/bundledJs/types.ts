import type { FsDriver as RendererFsDriver } from '@joplin/renderer/types';
import Renderer from './Renderer';

export interface RendererWebViewOptions {
	settings: {
		safeMode: boolean;
		tempDir: string;
		resourceDir: string;
		resourceDownloadMode: string;
	};
	useTransferredFiles: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	pluginOptions: Record<string, any>;
}

export interface ExtraContentScriptSource {
	id: string;
	js: string;
	assetPath: string;
	pluginId: string;
}

export interface NoteViewerLocalApi {
	renderer: Renderer;
	jumpToHash: (hash: string)=> void;
}

export interface NoteViewerRemoteApi {
	onScroll(scrollTop: number): void;
	onPostMessage(message: string): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	onPostPluginMessage(contentScriptId: string, message: any): Promise<any>;
	fsDriver: RendererFsDriver;
}

export interface WebViewLib {
	initialize(config: unknown): void;
}

