
import type * as CodeMirrorState from '@codemirror/state';
import type * as CodeMirrorView from '@codemirror/view';


export default (_context: { contentScriptId: string }) => {
	return {
		plugin: (codeMirror: any, codeMirrorPackages: any) => {
			console.warn('content script', codeMirrorPackages);
			(window as any).cmp = codeMirrorPackages;

			const { lineNumbers } = codeMirrorPackages.codemirror.view as typeof CodeMirrorView;
			const { StateEffect } = codeMirrorPackages.codemirror.state as typeof CodeMirrorState;
			const editorView: CodeMirrorView.EditorView = codeMirrorPackages.view;

			editorView.dispatch({
				effects: [
					StateEffect.appendConfig.of([
						lineNumbers(),
					]),
				],
			});
		},
	};
};