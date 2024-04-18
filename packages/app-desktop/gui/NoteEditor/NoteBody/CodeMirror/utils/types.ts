export interface RenderedBody {
	html: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
