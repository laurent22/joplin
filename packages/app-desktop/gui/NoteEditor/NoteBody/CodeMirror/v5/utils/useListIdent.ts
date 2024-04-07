import markdownUtils from '@joplin/lib/markdownUtils';

// Markdown list indentation.
// If the current line starts with `markup.list` token,
// hitting `Tab` key indents the line instead of inserting tab at cursor.
// hitting enter will insert a new list element, and unindent/delete an empty element
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function useListIdent(CodeMirror: any) {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function isSelection(anchor: any, head: any) {
		return anchor.line !== head.line || anchor.ch !== head.ch;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function getIndentLevel(cm: any, line: number) {
		const tokens = cm.getLineTokens(line);
		let indentLevel = 0;
		if (tokens.length > 0 && tokens[0].string.match(/^\s/)) {
			indentLevel = tokens[0].string.length;
		}

		return indentLevel;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function newListToken(cm: any, line: number) {
		const currentToken = markdownUtils.extractListToken(cm.getLine(line));
		const indentLevel = getIndentLevel(cm, line);

		while (--line > 0) {
			const currentLine = cm.getLine(line);
			if (!markdownUtils.isListItem(currentLine)) return currentToken;

			const indent = getIndentLevel(cm, line);

			if (indent < indentLevel - 1) return currentToken;

			if (indent === indentLevel - 1) {
				if (markdownUtils.olLineNumber(currentLine)) {
					return `${markdownUtils.olLineNumber(currentLine) + 1}. `;
				}
				const token = markdownUtils.extractListToken(currentLine);
				if (token.match(/x/)) {
					return '- [ ] ';
				}
				return token;
			}
		}

		return currentToken;
	}

	// Gets the character coordinates of the start and end of a list token
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	function getListSpan(listTokens: any, line: string) {
		let start = listTokens[0].start;
		const token = markdownUtils.extractListToken(line);

		if (listTokens.length > 1 && listTokens[0].string.match(/^\s/)) {
			start = listTokens[1].start;
		}

		return { start: start, end: start + token.length };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	CodeMirror.commands.smartListIndent = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();

		cm.operation(() => {
			for (let i = 0; i < ranges.length; i++) {
				const { anchor, head } = ranges[i];

				const line = cm.getLine(anchor.line);

				// This is an actual selection and we should indent
				if (isSelection(anchor, head)) {
					cm.execCommand('defaultTab');
					// This will apply to all selections so it makes sense to stop processing here
					// this is an edge case for users because there is no clear intended behavior
					// if the use multicursor with a mix of selected and not selected
					break;
				} else if (!markdownUtils.isListItem(line) || !markdownUtils.isEmptyListItem(line)) {
					cm.replaceRange('\t', anchor, head);
				} else {
					if (markdownUtils.olLineNumber(line)) {
						const tokens = cm.getLineTokens(anchor.line);
						const { start, end } = getListSpan(tokens, line);
						// Resets numbered list to 1.
						cm.replaceRange('1. ', { line: anchor.line, ch: start }, { line: anchor.line, ch: end });
					}

					cm.indentLine(anchor.line, 'add');
				}
			}
		});
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	CodeMirror.commands.smartListUnindent = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();

		cm.operation(() => {
			for (let i = 0; i < ranges.length; i++) {
				const { anchor, head } = ranges[i];

				const line = cm.getLine(anchor.line);

				// This is an actual selection and we should unindent
				if (isSelection(anchor, head)) {
					cm.execCommand('indentLess');
					// This will apply to all selections so it makes sense to stop processing here
					// this is an edge case for users because there is no clear intended behavior
					// if the use multicursor with a mix of selected and not selected
					break;
				} else if (!markdownUtils.isListItem(line) || !markdownUtils.isEmptyListItem(line)) {
					cm.indentLine(anchor.line, 'subtract');
				} else {
					const newToken = newListToken(cm, anchor.line);
					const tokens = cm.getLineTokens(anchor.line);
					const { start, end } = getListSpan(tokens, line);

					cm.replaceRange(newToken, { line: anchor.line, ch: start }, { line: anchor.line, ch: end });

					cm.indentLine(anchor.line, 'subtract');
				}
			}
		});
	};

	// This is a special case of insertList element because it happens when
	// vim is in normal mode and input is disabled and the cursor is not
	// necessarily at the end of line (but it should pretend it is
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	CodeMirror.commands.vimInsertListElement = function(cm: any) {
		cm.setOption('disableInput', false);

		const ranges = cm.listSelections();
		if (ranges.length === 0) return;
		const { anchor } = ranges[0];

		// Need to move the cursor to end of line as this is the vim behavior
		const line = cm.getLine(anchor.line);
		cm.setCursor({ line: anchor.line, ch: line.length });

		cm.execCommand('insertListElement');
		CodeMirror.Vim.handleKey(cm, 'i', 'macro');
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	CodeMirror.commands.insertListElement = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();
		if (ranges.length === 0) return;
		const { anchor } = ranges[0];

		// Only perform the extra smart code if there is a single cursor
		// otherwise fallback on the default codemirror behavior
		if (ranges.length === 1) {
			const line = cm.getLine(anchor.line);
			// if cursor on 0th line set previousLine=''
			const previousLine = anchor.line ? cm.getLine(anchor.line - 1) : '';

			if (markdownUtils.isEmptyListItem(line)) {
				const tokens = cm.getLineTokens(anchor.line);
				//  A empty list item with an indent will have whitespace as the first token
				if (tokens.length > 1 && tokens[0].string.match(/^\s/)) {
					cm.execCommand('smartListUnindent');
				} else if (markdownUtils.isListItem(previousLine)) {
					cm.replaceRange('', { line: anchor.line, ch: 0 }, anchor);
				} else { // perform normal enter key operation
					cm.replaceRange('\n', anchor);
				}
				return;
			}
		}

		// Disable automatic indent for html/xml outside of codeblocks
		const state = cm.getTokenAt(anchor).state;
		const mode = cm.getModeAt(anchor);

		// html/xml inside of a codeblock is fair game for auto-indent
		// for states who's mode is xml, having the localState property means they are within a code block
		if (mode.name !== 'xml' || !!state.outer.localState) {
			cm.execCommand('newlineAndIndentContinueMarkdownList');
		} else {
			cm.replaceSelection('\n');
		}
	};
}
