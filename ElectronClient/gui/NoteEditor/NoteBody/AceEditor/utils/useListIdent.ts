import { useEffect } from 'react';
import { selectionRange } from './index';

interface HookDependencies {
	editor: any,
}

export default function useListIdent(dependencies:HookDependencies) {
	const { editor } = dependencies;

	useEffect(() => {
		if (!editor) return;

		// Markdown list indentation. (https://github.com/laurent22/joplin/pull/2713)
		// If the current line starts with `markup.list` token,
		// hitting `Tab` key indents the line instead of inserting tab at cursor.
		const originalEditorIndent = editor.indent;

		editor.indent = function() {
			const range = selectionRange(editor);
			if (range.isEmpty()) {
				const row = range.start.row;
				const tokens = this.session.getTokens(row);

				if (tokens.length > 0 && tokens[0].type == 'markup.list') {
					if (tokens[0].value.search(/\d+\./) != -1) {
						// Resets numbered list to 1.
						this.session.replace({ start: { row, column: 0 }, end: { row, column: tokens[0].value.length } },
							tokens[0].value.replace(/\d+\./, '1.'));
					}

					this.session.indentRows(row, row, '\t');
					return;
				}
			}

			if (originalEditorIndent) originalEditorIndent.call(this);
		};
	}, [editor]);
}
