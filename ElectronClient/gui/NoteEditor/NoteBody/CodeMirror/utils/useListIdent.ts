const { isListItem, isEmptyListItem, extractListToken, olLineNumber } = require('lib/markdownUtils');

// Markdown list indentation.
// If the current line starts with `markup.list` token,
// hitting `Tab` key indents the line instead of inserting tab at cursor.
// hitting enter will insert a new list element, and unindent/delete an empty element
export default function useListIdent(CodeMirror: any) {

	function isSelection(anchor: any, head: any) {
		return anchor.line !== head.line || anchor.ch !== head.ch;
	}

	function getIndentLevel(cm: any, line: number) {
		const tokens = cm.getLineTokens(line);
		let indentLevel = 0;
		if (tokens.length > 0 && tokens[0].string.match(/\s/)) {
			indentLevel = tokens[0].string.length;
		}

		return indentLevel;
	}

	function newListToken(cm: any, line: number) {
		const currentToken = extractListToken(cm.getLine(line));
		const indentLevel = getIndentLevel(cm, line);

		while (--line > 0) {
			const currentLine = cm.getLine(line);
			if (!isListItem(currentLine)) return currentToken;

			const indent = getIndentLevel(cm, line);

			if (indent < indentLevel - 1) return currentToken;

			if (indent === indentLevel - 1) {
				if (olLineNumber(currentLine)) {
					return `${olLineNumber(currentLine) + 1}. `;
				}
				const token = extractListToken(currentLine);
				if (token.match(/x/)) {
					return '- [ ] ';
				}
				return token;
			}
		}

		return currentToken;
	}

	// Gets the character coordinates of the start and end of a list token
	function getListSpan(listTokens: any, line: string) {
		let start = listTokens[0].start;
		const token = extractListToken(line);

		if (listTokens.length > 1 && listTokens[0].string.match(/\s/)) {
			start = listTokens[1].start;
		}

		return { start: start, end: start + token.length };
	}

	CodeMirror.commands.smartListIndent = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();
		for (let i = 0; i < ranges.length; i++) {
			const { anchor, head } = ranges[i];

			const line = cm.getLine(anchor.line);

			// This is an actual selection and we should indent
			if (isSelection(anchor, head) || !isListItem(line)) {
				cm.execCommand('defaultTab');
			} else {
				if (olLineNumber(line)) {
					const tokens = cm.getLineTokens(anchor.line);
					const { start, end } = getListSpan(tokens, line);
					// Resets numbered list to 1.
					cm.replaceRange('1. ',  { line: anchor.line, ch: start }, { line: anchor.line, ch: end });
				}

				cm.indentLine(anchor.line, 'add');
			}
		}
	};

	CodeMirror.commands.smartListUnindent = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();
		for (let i = 0; i < ranges.length; i++) {
			const { anchor, head } = ranges[i];

			const line = cm.getLine(anchor.line);

			// This is an actual selection and we should unindent
			if (isSelection(anchor, head) || !isListItem(line)) {
				cm.execCommand('indentLess');
			} else {
				const newToken = newListToken(cm, anchor.line);
				const tokens = cm.getLineTokens(anchor.line);
				const { start, end } = getListSpan(tokens, line);

				cm.replaceRange(newToken, { line: anchor.line, ch: start }, { line: anchor.line, ch: end });

				cm.indentLine(anchor.line, 'subtract');
			}
		}
	};

	CodeMirror.commands.insertListElement = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();
		for (let i = 0; i < ranges.length; i++) {
			const { anchor } = ranges[i];

			const line = cm.getLine(anchor.line);

			if (isEmptyListItem(line)) {
				const tokens = cm.getLineTokens(anchor.line);
				//  A empty list item with an indent will have whitespace as the first token
				if (tokens.length > 1 && tokens[0].string.match(/\s/)) {
					cm.execCommand('smartListUnindent');
				} else {
					cm.replaceRange('', { line: anchor.line, ch: 0 }, anchor);
				}
			} else {
				cm.execCommand('newlineAndIndentContinueMarkdownList');
			}
		}
	};
}
