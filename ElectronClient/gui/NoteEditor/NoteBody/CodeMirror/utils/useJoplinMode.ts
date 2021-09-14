import 'codemirror/addon/mode/multiplex';
import 'codemirror/mode/stex/stex';

// Joplin markdown is a the same as markdown mode, but it has configured defaults
// and support for katex math blocks
export default function useJoplinMode(CodeMirror: any) {

	CodeMirror.defineMode('joplin-markdown', (config: any) => {
		const markdownConfig = {
			name: 'markdown',
			taskLists: true,
			strikethrough: true,
			emoji: true,
			tokenTypeOverrides: {
				linkText: 'link-text',
			},
		};

		const markdownMode = CodeMirror.getMode(config, markdownConfig);
		const stex = CodeMirror.getMode(config, { name: 'stex', inMathMode: true });

		const inlineKatexOpenRE = /(?<!\S)\$(?=[^\s$].*?[^\\\s$]\$(?!\S))/;
		const inlineKatexCloseRE = /(?<![\\\s$])\$(?!\S)/;
		const blockKatexRE = /(?<!\\)\$\$/;

		// Find token will search for a valid katex start or end token
		// If found then it will return the index, otherwise -1
		function findToken(stream: any, token: RegExp) {
			const match = token.exec(stream.string.slice(stream.pos));

			return match ? match.index + stream.pos : -1;
		}

		return {
			startState: function(): {outer: any, openCharacter: string, inner: any} {
				return {
					outer: CodeMirror.startState(markdownMode),
					openCharacter: '',
					inner: CodeMirror.startState(stex),
				};
			},

			copyState: function(state: any) {
				return {
					outer: CodeMirror.copyState(markdownMode, state.outer),
					openCharacter: state.openCharacter,
					inner: CodeMirror.copyState(stex, state.inner),
				};
			},

			token: function(stream: any, state: any) {
				let currentMode = markdownMode;
				let currentState = state.outer;
				let tokenLabel = 'katex-marker-open';
				let nextTokenPos = stream.string.length;
				let closing = false;

				const blockPos = findToken(stream, blockKatexRE);

				if (state.openCharacter) {
					currentMode = stex;
					currentState = state.inner;
					tokenLabel = 'katex-marker-close';
					closing = true;

					const inlinePos = findToken(stream, inlineKatexCloseRE);

					if (state.openCharacter === '$$' && blockPos !== -1) nextTokenPos = blockPos;
					if (state.openCharacter === '$' && inlinePos !== -1) nextTokenPos = inlinePos;
				} else {
					const inlinePos = findToken(stream, inlineKatexOpenRE);

					if (blockPos !== -1) nextTokenPos = blockPos;
					if (inlinePos !== -1 && inlinePos < nextTokenPos) nextTokenPos = inlinePos;

					if (blockPos === stream.pos) state.openCharacter = '$$';
					if (inlinePos === stream.pos) state.openCharacter = '$';
				}

				if (nextTokenPos === stream.pos) {
					stream.match(state.openCharacter);

					if (closing) state.openCharacter = '';

					return tokenLabel;
				}

				// If we found a token in this stream but haven;t reached it yet, then we will
				// pass all the characters leading up to our token to markdown mode
				const oldString = stream.string;

				stream.string = oldString.slice(0, nextTokenPos);
				const token = currentMode.token(stream, currentState);
				stream.string = oldString;

				return token;
			},

			indent: function(state: any, textAfter: string, line: any) {
				const mode = state.openCharacter ? stex : markdownMode;
				if (!mode.indent) return CodeMirror.Pass;
				return mode.indent(state.openCharacter ? state.inner : state.outer, textAfter, line);
			},

			blankLine: function(state: any) {
				const mode = state.openCharacter ? stex : markdownMode;
				if (mode.blankLine) {
					mode.blankLine(state.openCharacter ? state.inner : state.outer);
				}
			},

			electricChars: markdownMode.electricChars,

			innerMode: function(state: any) {
				return state.openCharacter ? { state: state.inner, mode: stex } : { state: state.outer, mode: markdownMode };
			},

		};
	});
}
