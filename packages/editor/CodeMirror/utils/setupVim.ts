import CodeMirrorControl from '../CodeMirrorControl';

interface AppCommands {
	sync(): void;
}

const setupVim = (CodeMirror: CodeMirrorControl, commands: AppCommands|null) => {
	CodeMirror.Vim.defineAction('swapLineDown', CodeMirror.commands.swapLineDown);
	CodeMirror.Vim.mapCommand('<A-j>', 'action', 'swapLineDown', {}, { context: 'normal', isEdit: true });
	CodeMirror.Vim.defineAction('swapLineUp', CodeMirror.commands.swapLineUp);
	CodeMirror.Vim.mapCommand('<A-k>', 'action', 'swapLineUp', {}, { context: 'normal', isEdit: true });
	CodeMirror.Vim.defineAction('insertListElement', CodeMirror.commands.vimInsertListElement);
	CodeMirror.Vim.mapCommand('o', 'action', 'insertListElement', { after: true }, { context: 'normal', isEdit: true, interlaceInsertRepeat: true });

	if (commands) {
		CodeMirror.Vim.defineEx('write', 'w', () => {
			commands.sync();
		});
	}
};

export default setupVim;
