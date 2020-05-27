// Markdown list indentation.
// If the current line starts with `markup.list` token,
// hitting `Tab` key indents the line instead of inserting tab at cursor.
export default function useListIdent(CodeMirror: any) {

	function isSelection(anchor: any, head: any) {
		return anchor.line !== head.line || anchor.ch !== head.ch;
	}

	CodeMirror.commands.smartListIndent = function(cm: any) {
		if (cm.getOption('disableInput')) return CodeMirror.Pass;

		const ranges = cm.listSelections();
		for (let i = 0; i < ranges.length; i++) {
			const { anchor, head } = ranges[i];

			const tokens = cm.getLineTokens(anchor.line);
			console.log(tokens);

			// This is an actual selection and we should indent
			if (isSelection(anchor, head) || tokens.length == 0 || !tokens[0].state.base.list) {
				cm.execCommand('defaultTab');
			} else {
				let token: any = tokens[0];

				if (tokens[0].string.match(/\s/) && tokens.length > 1) { token = tokens[1]; }

				if (token.string.match(/\d+/)) {
					// Resets numbered list to 1.
					cm.replaceRange('1',  { line: anchor.line, ch: token.start }, { line: anchor.line, ch: token.end });
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

			const tokens = cm.getLineTokens(anchor.line);

			// This is an actual selection and we should indent
			if (isSelection(anchor, head) || tokens.length == 0 || !tokens[0].state.base.list) {
				cm.execCommand('indentAuto');
			} else {
				cm.indentLine(anchor.line, 'subtract');
			}
		}
	};
}
