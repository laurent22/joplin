import { ResourceEntity } from '@joplin/lib/services/database/types';
import { Theme } from '@joplin/lib/themes/type';
import type { FsDriver as RendererFsDriver } from '@joplin/renderer/types';
import Renderer from './Renderer';

export interface WebViewConfig {
	theme: Theme;
	codeTheme: any;
	highlightedKeywords: string[];
	resources: Record<string, ResourceEntity>;
	resourceDownloadMode: 'always'|'manual'|'auto';
	initialScroll: number;
	noteHash: string;

	editPopupFiletypes: string[];
	createEditPopupSyntax: string;
	destroyEditPopupSyntax: string;
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
