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
