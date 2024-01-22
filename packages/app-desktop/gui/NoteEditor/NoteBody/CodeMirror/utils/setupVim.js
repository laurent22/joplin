'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const setupVim = (CodeMirror) => {
	CodeMirror.Vim.defineAction('swapLineDown', CodeMirror.commands.swapLineDown);
	CodeMirror.Vim.mapCommand('<A-j>', 'action', 'swapLineDown', {}, { context: 'normal', isEdit: true });
	CodeMirror.Vim.defineAction('swapLineUp', CodeMirror.commands.swapLineUp);
	CodeMirror.Vim.mapCommand('<A-k>', 'action', 'swapLineUp', {}, { context: 'normal', isEdit: true });
	CodeMirror.Vim.defineAction('insertListElement', CodeMirror.commands.vimInsertListElement);
	CodeMirror.Vim.mapCommand('o', 'action', 'insertListElement', { after: true }, { context: 'normal', isEdit: true, interlaceInsertRepeat: true });
};
exports.default = setupVim;
// # sourceMappingURL=setupVim.js.map
