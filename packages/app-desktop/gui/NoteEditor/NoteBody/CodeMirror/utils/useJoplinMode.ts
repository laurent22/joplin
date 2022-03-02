import 'codemirror/addon/mode/multiplex';
import 'codemirror/mode/stex/stex';
import MarkdownUtils from '@joplin/lib/markdownUtils';
import Setting from '@joplin/lib/models/Setting';

interface JoplinModeState {
	outer: any;
	openCharacter: string;
	inTable: boolean;
	inCodeBlock: boolean;
	inner: any;
}


// Joplin markdown is a the same as markdown mode, but it has configured defaults
// and support for katex math blocks
export default function useJoplinMode(CodeMirror: any) {

	CodeMirror.defineMode('joplin-markdown', (config: any) => {
		const markdownConfig = {
			name: 'markdown',
			taskLists: true,
			strikethrough: true,
			emoji: Setting.value('markdown.plugin.emoji'),
			tokenTypeOverrides: {
				linkText: 'link-text',
			},
		};

		const markdownMode = CodeMirror.getMode(config, markdownConfig);
		const stex = CodeMirror.getMode(config, { name: 'stex', inMathMode: true });

		const inlineKatexOpenRE = /(?<!\\)\$(?=[^\s$].*?[^\\\s$]\$(?![0-9]))/;
		const inlineKatexCloseRE = /(?<![\\\s$])\$(?![0-9])/;
		const blockKatexOpenRE = /(?<!\S)\$\$/;
		const blockKatexCloseRE = /(?<![\\\s])\$\$/;

		// Find token will search for a valid katex start or end token
		// If found then it will return the index, otherwise -1
		function findToken(stream: any, token: RegExp) {
			const match = token.exec(stream.string.slice(stream.pos));

			return match ? match.index + stream.pos : -1;
		}

		return {
			startState: function(): JoplinModeState {
				return {
					outer: CodeMirror.startState(markdownMode),
					openCharacter: '',
					inTable: false,
					inCodeBlock: false,
					inner: CodeMirror.startState(stex),
				};
			},

			copyState: function(state: JoplinModeState) {
				return {
					outer: CodeMirror.copyState(markdownMode, state.outer),
					openCharacter: state.openCharacter,
					inTable: state.inTable,
					inCodeBlock: state.inCodeBlock,
					inner: CodeMirror.copyState(stex, state.inner),
				};
			},

			token: function(stream: any, state: JoplinModeState) {
				let currentMode = markdownMode;
				let currentState = state.outer;

				// //////// KATEX //////////
				let tokenLabel = 'katex-marker-open';
				let nextTokenPos = stream.string.length;
				let closing = false;

				if (state.openCharacter) {
					currentMode = stex;
					currentState = state.inner;
					tokenLabel = 'katex-marker-close';
					closing = true;

					const blockPos = findToken(stream, blockKatexCloseRE);
					const inlinePos = findToken(stream, inlineKatexCloseRE);

					if (state.openCharacter === '$$' && blockPos !== -1) nextTokenPos = blockPos;
					if (state.openCharacter === '$' && inlinePos !== -1) nextTokenPos = inlinePos;
				} else if (!currentState.code && Setting.value('markdown.plugin.katex')) {
					const blockPos = findToken(stream, blockKatexOpenRE);
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
				// //////// End KATEX //////////

				// //////// Markdown //////////
				// If we found a token in this stream but haven;t reached it yet, then we will
				// pass all the characters leading up to our token to markdown mode
				const oldString = stream.string;

				stream.string = oldString.slice(0, nextTokenPos);
				let token = currentMode.token(stream, currentState);
				stream.string = oldString;
				// //////// End Markdown //////////

				// //////// Monospace //////////
				let isMonospace = false;
				// After being passed to the markdown mode we can check if the
				// code state variables are set
				// Code
				if (state.outer.code > 0) {
					// state.outer.code holds the number of preceding backticks
					// anything > 0 backticks is an inline-code-block
					// -1 is used for actual code blocks
					isMonospace = true;
					token = `${token} jn-inline-code`;
				} else if (state.outer.thisLine && state.outer.thisLine.fencedCodeEnd) {
					state.inCodeBlock = false;
					isMonospace = true;
					token = `${token} line-cm-jn-code-block line-background-cm-jn-code-block-background`;
				} else if (state.outer.code === -1 || state.inCodeBlock) {
					state.inCodeBlock = true;
					isMonospace = true;
					token = `${token} line-cm-jn-code-block line-background-cm-jn-code-block-background`;
				} else if (stream.pos > 0 && stream.string[stream.pos - 1] === '`' &&
										!!token && token.includes('comment')) {
					// This grabs the closing backtick for inline Code
					isMonospace = true;
					token = `${token} jn-inline-code`;
				}
				// Indented Code
				if (state.outer.indentedCode) {
					isMonospace = true;
				}
				// Task lists
				if (state.outer.taskList || state.outer.taskOpen || state.outer.taskClosed) {
					isMonospace = true;
				}

				// Any line that contains a | is potentially a table row
				if (stream.string.match(/\|/g)) {
					// Check if the current and following line together make a valid
					// markdown table header
					if (MarkdownUtils.matchingTableDivider(stream.string, stream.lookAhead(1))) {
						state.inTable = true;
					}

					// Treat all lines that start with | as a table row
					if (state.inTable || stream.string[0] === '|') {
						isMonospace = true;
					}
				} else {
					state.inTable = false;
				}

				if (isMonospace) { token = `${token} jn-monospace`; }
				// //////// End Monospace //////////

				return token;
			},

			indent: function(state: JoplinModeState, textAfter: string, line: any) {
				const mode = state.openCharacter ? stex : markdownMode;
				if (!mode.indent) return CodeMirror.Pass;
				return mode.indent(state.openCharacter ? state.inner : state.outer, textAfter, line);
			},

			blankLine: function(state: JoplinModeState) {
				const mode = state.openCharacter ? stex : markdownMode;
				if (mode.blankLine) {
					mode.blankLine(state.openCharacter ? state.inner : state.outer);
				}

				state.inTable = false;

				if (state.inCodeBlock) return 'line-cm-jn-code-block line-background-cm-jn-code-block-background';

				return null;
			},

			electricChars: markdownMode.electricChars,

			innerMode: function(state: JoplinModeState) {
				return state.openCharacter ? { state: state.inner, mode: stex } : { state: state.outer, mode: markdownMode };
			},

		};
	});
}
