'use strict';
// CodeMirror extension that adds table-specific keybindings.
//
// - Tab: Move to the next cell (or add a new row at the end)
// - Shift+Tab: Move to the previous cell
//
// These keybindings only activate when the cursor is inside a Markdown table.
// Otherwise, the default behavior (indent/dedent) is used.
Object.defineProperty(exports, '__esModule', { value: true });
const view_1 = require('@codemirror/view');
const tableCommands_1 = require('../editorCommands/tableCommands');
const tableEditingExtension = view_1.keymap.of([
	{
		key: 'Tab',
		run: (view) => {
			return (0, tableCommands_1.tableNextCell)(view);
		},
	},
	{
		key: 'Shift-Tab',
		run: (view) => {
			return (0, tableCommands_1.tablePreviousCell)(view);
		},
	},
]);
exports.default = tableEditingExtension;
// # sourceMappingURL=tableEditingExtension.js.map
