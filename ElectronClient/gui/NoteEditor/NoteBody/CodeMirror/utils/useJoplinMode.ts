import 'codemirror/mode/stex/stex';

// We use require here because multiplex is a javascript file
// multiplex is copied from codemirror/addon/mode/multiplex and is orginally js
const { useMultiplexer } = require('./multiplex');

// Joplin markdown is a the same as markdown mode, but it has configured defaults
// and support for katex math blocks
export default function useJoplinMode(CodeMirror: any) {
	useMultiplexer(CodeMirror);

	CodeMirror.defineMode('joplin-markdown', (config: any) => {
		const stex = CodeMirror.getMode(config, { name: 'stex', inMathMode: true });
		const blocks = [{ open: '$$', close: '$$', mode: stex, delimStyle: 'katex-marker' },
			// This regex states that an inline katex block must have a closing deliminator to be valid
			// it also has some stipulations about the surrounding characters
			{ openCheck: /\\?\$\S[\s\S]*?[^\\\s]\$(?:\s|$)/, open: '$', close: '$', mode: stex, delimStyle: 'katex-marker' }];

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
