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

export interface CodeMirrorKey {
	command: string;
	label: string;
	default: string; // Accelerator for Windows/Linux
	macos: string; // Accelerator for MacOS
}

