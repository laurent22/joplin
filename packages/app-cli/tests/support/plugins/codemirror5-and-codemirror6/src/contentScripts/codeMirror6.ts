import { lineNumbers, highlightActiveLine } from '@codemirror/view';

export default (context: { contentScriptId: string, postMessage: any }) => {
	return {
		plugin: async (codeMirrorWrapper: any) => {
			if (!codeMirrorWrapper.cm6) return;

			codeMirrorWrapper.addExtension(lineNumbers());

			// This calls the .onMessage listener we registered in index.ts and stores
			// the listener's return value in `settings`.
			const settings = await context.postMessage('getSettings');
			if (settings.highlightActiveLine) {
				codeMirrorWrapper.addExtension(highlightActiveLine());
			}
		},
		assets: () => {
			return [ { name: './style.css' } ];
		},
	};
};