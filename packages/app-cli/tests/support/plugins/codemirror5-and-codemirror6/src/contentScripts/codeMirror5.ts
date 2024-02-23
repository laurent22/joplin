export default (context: { contentScriptId: string, postMessage: any }) => {
	return {
		plugin: async (codeMirror: any) => {
			// Exit if not a CodeMirror 5 editor.
			if (codeMirror.cm6) {
				return;
			}

			codeMirror.defineOption('enable-highlight-extension', true, async function() {
				const settings = await context.postMessage('getSettings');
				this.setOption('styleActiveLine', settings.highlightActiveLine);
			});
		},

		// Sets CodeMirror 5 default options. Has no efffect in CodeMirror 6.
		codeMirrorOptions: { 'lineNumbers': true, 'enable-highlight-extension': true },

		// See https://codemirror.net/5/doc/manual.html#addon_active-line
		codeMirrorResources: [ 'addon/selection/active-line.js' ],

		assets: () => {
			return [ { name: './style.css' } ];
		},
	};
};