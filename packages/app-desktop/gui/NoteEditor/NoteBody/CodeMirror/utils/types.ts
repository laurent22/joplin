import { RenderResultPluginAsset } from '@joplin/renderer/types';

export interface RenderedBody {
	html: string;
	pluginAssets: RenderResultPluginAsset[];
}

export function defaultRenderedBody(): RenderedBody {
	return {
		html: '',
		pluginAssets: [],
	};
}

export enum CodeMirrorVersion {
	CodeMirror5,
	CodeMirror6,
}
