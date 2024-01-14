import type { FsDriver as RendererFsDriver } from '@joplin/renderer/types';
import Renderer from './Renderer';

export interface RendererWebViewOptions {
	settings: {
		safeMode: boolean;
		tempDir: string;
		resourceDir: string;
		resourceDownloadMode: string;
	};
	pluginOptions: Record<string, any>;
}

export interface NoteViewerLocalApi {
	renderer: Renderer;
	jumpToHash: (hash: string)=> void;
}

export interface NoteViewerRemoteApi {
	onScroll(scrollTop: number): void;
	onPostMessage(message: string): void;
	fsDriver: RendererFsDriver;
}
