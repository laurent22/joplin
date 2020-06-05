import { useEffect } from 'react';
import { selectionRange } from './index';
const markdownUtils = require('lib/markdownUtils');

// The line that contains only `- ` is
// recognized as a heading in Ace.
function hyphenEmptyListItem(tokens: any[]) {
	return (
		tokens.length === 2 &&
		tokens[0].type === 'markup.heading.2' &&
		tokens[0].value === '-' &&
		tokens[1].type === 'text.xml' &&
		tokens[1].value === ' '
	);
}

// Returns tokens of the line if it starts with a 'markup.list' token.
function listTokens(editor: any, row: number) {
	const tokens = editor.session.getTokens(row);
	if (
		!(tokens.length > 0 && tokens[0].type === 'markup.list') &&
		!hyphenEmptyListItem(tokens)
	) {
		return [];
	}
	return tokens;
}

function countIndent(line: string): number {
	return line.match(/\t| {4}/g)?.length || 0;
}

// Finds the list item with indent level `prevIndent`.
function findPrevListNum(editor: any, row: number, indent: number) {
	while (row > 0) {
		row--;
		const line = editor.session.getLine(row);

		if (countIndent(line) === indent) {
			const num = markdownUtils.olLineNumber(line.trimLeft());
			if (num) {
				return num;
			}
		}
	}
	return 0;
}

interface HookDependencies {
	editor: any;
}

export default function useListIdent(dependencies: HookDependencies) {
	const { editor } = dependencies;

	useEffect(() => {
		if (!editor) return () => {};

		// Markdown list indentation. (https://github.com/laurent22/joplin/pull/2713)
		// If the current line starts with `markup.list` token,
		// hitting `Tab` key indents the line instead of inserting tab at cursor.
		const originalEditorIndent = editor.indent;

		editor.indent = function() {
			const range = selectionRange(editor);
			if (range.isEmpty()) {
				const row = range.start.row;
				const tokens = listTokens(this, row);

				if (tokens.length > 0) {
					if (tokens[0].value.search(/\d+\./) != -1) {
						const line = this.session.getLine(row);
						const n = findPrevListNum(this, row, countIndent(line) + 1) + 1;
						this.session.replace(
							{
								start: { row, column: 0 },
								end: { row, column: tokens[0].value.length },
							},
							tokens[0].value.replace(/\d+\./, `${n}.`)
						);
					}

					this.session.indentRows(row, row, '\t');
					return;
				}
			}

			if (originalEditorIndent) originalEditorIndent.call(this);
		};

		// Correct the number of numbered list item when outdenting.
		editor.commands.addCommand({
			name: 'markdownOutdent',
			bindKey: { win: 'Shift+Tab', mac: 'Shift+Tab' },
			multiSelectAction: 'forEachLine',
			exec: function(editor: any) {
				const range = selectionRange(editor);

				if (range.isEmpty()) {
					const row = range.start.row;

					const tokens = editor.session.getTokens(row);
					if (tokens.length && tokens[0].type === 'markup.list') {
						const matches = tokens[0].value.match(/^(\t+)\d+\./);
						if (matches && matches.length) {
							const indent = countIndent(matches[1]);
							const n = findPrevListNum(editor, row, indent - 1) + 1;
							console.log(n);
							editor.session.replace(
								{
									start: { row, column: 0 },
									end: { row, column: tokens[0].value.length },
								},
								tokens[0].value.replace(/\d+\./, `${n}.`)
							);
						}
					}
				}

				editor.blockOutdent();
			},
			readonly: false,
		});

		// Delete a list markup (e.g. `- `) from an empty list item on hitting Enter.
		// (https://github.com/laurent22/joplin/pull/2772)
		editor.commands.addCommand({
			name: 'markdownEnter',
			bindKey: 'Enter',
			multiSelectAction: 'forEach',
			exec: function(editor: any) {
				const range = editor.getSelectionRange();
				const tokens = listTokens(editor, range.start.row);

				const emptyListItem =
					tokens.length === 1 || hyphenEmptyListItem(tokens);
				const emptyCheckboxItem =
					tokens.length === 3 &&
					['[ ]', '[x]'].includes(tokens[1].value) &&
					tokens[2].value === ' ';

				if (!range.isEmpty() || !(emptyListItem || emptyCheckboxItem)) {
					editor.insert('\n');
					// Cursor can go out of the view after inserting '\n'.
					editor.renderer.scrollCursorIntoView();
					return;
				}

				const row = range.start.row;
				const line = editor.session.getLine(row);
				let indent = editor
					.getSession()
					.getMode()
					.getNextLineIndent(null, line);
				if (indent.startsWith('\t')) {
					indent = indent.slice(1);
				} else {
					indent = '';
				}

				editor.session.replace(
					{
						start: { row, column: 0 },
						end: { row, column: line.length },
					},
					indent
				);
			},
			readOnly: false,
		});

		return () => {
			editor.indent = originalEditorIndent;
			editor.commands.removeCommand('markdownOutdent');
			editor.commands.removeCommand('markdownEnter');
		};
	}, [editor]);
}
