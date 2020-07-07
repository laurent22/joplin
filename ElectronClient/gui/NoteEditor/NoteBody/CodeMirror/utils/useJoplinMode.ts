import 'codemirror/addon/mode/multiplex';
import 'codemirror/mode/stex/stex';

// Joplin markdown is a the same as markdown mode, but it has configured defaults
// and support for katex math blocks
export default function useJoplinMode(CodeMirror: any) {
	CodeMirror.defineMode('joplin-markdown', (config: any) => {
		const stex = CodeMirror.getMode(config, { name: 'stex', inMathMode: true });
		const blocks = [{ open: '$$', close: '$$', mode: stex, delimStyle: 'katex-marker' },
			{ open: '$', close: '$', mode: stex, delimStyle: 'katex-marker' }];

		const markdownOptions = {
			name: 'markdown',
			taskLists: true,
			strikethrough: true,
			emoji: true,
			tokenTypeOverrides: {
				linkText: 'link-text',
			},
		};

		return CodeMirror.multiplexingMode(CodeMirror.getMode(config, markdownOptions), ...blocks);

	});
}
