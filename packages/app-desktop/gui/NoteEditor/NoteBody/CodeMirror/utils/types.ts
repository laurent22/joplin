export interface RenderedBody {
	html: string;
	pluginAssets: any[];
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
