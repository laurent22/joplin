import CodeMirrorControl from '@joplin/editor/CodeMirror/CodeMirrorControl';

const setupVim = (CodeMirror: CodeMirrorControl) => {
	CodeMirror.Vim.defineAction('swapLineDown', CodeMirror.commands.swapLineDown);
	CodeMirror.Vim.mapCommand('<A-j>', 'action', 'swapLineDown', {}, { context: 'normal', isEdit: true });
	CodeMirror.Vim.defineAction('swapLineUp', CodeMirror.commands.swapLineUp);
	CodeMirror.Vim.mapCommand('<A-k>', 'action', 'swapLineUp', {}, { context: 'normal', isEdit: true });
	CodeMirror.Vim.defineAction('insertListElement', CodeMirror.commands.vimInsertListElement);
	CodeMirror.Vim.mapCommand('o', 'action', 'insertListElement', { after: true }, { context: 'normal', isEdit: true, interlaceInsertRepeat: true });
};

export default setupVim;
