import { useEffect } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';

export default function useKeymap(CodeMirror: any) {

	function save() {
		CommandService.instance().execute('synchronize');
	}

	function setupEmacs() {
		CodeMirror.keyMap.emacs['Tab'] = 'smartListIndent';
		CodeMirror.keyMap.emacs['Enter'] = 'insertListElement';
		CodeMirror.keyMap.emacs['Shift-Tab'] = 'smartListUnindent';
	}

	function setupVim() {
		CodeMirror.Vim.defineAction('swapLineDown', CodeMirror.commands.swapLineDown);
		CodeMirror.Vim.mapCommand('<A-j>', 'action', 'swapLineDown', {},  { context: 'normal', isEdit: true });
		CodeMirror.Vim.defineAction('swapLineUp', CodeMirror.commands.swapLineUp);
		CodeMirror.Vim.mapCommand('<A-k>', 'action', 'swapLineUp', {},  { context: 'normal', isEdit: true });
		CodeMirror.Vim.defineAction('insertListElement', CodeMirror.commands.vimInsertListElement);
		CodeMirror.Vim.mapCommand('o', 'action', 'insertListElement', { after: true }, { context: 'normal', isEdit: true, interlaceInsertRepeat: true });
	}

	useEffect(() => {
		// This enables the special modes (emacs and vim) to initiate sync by the save action
		CodeMirror.commands.save = save;

		CodeMirror.keyMap.basic = {
			'Left': 'goCharLeft',
			'Right': 'goCharRight',
			'Up': 'goLineUp',
			'Down': 'goLineDown',
			'End': 'goLineRight',
			'Home': 'goLineLeftSmart',
			'PageUp': 'goPageUp',
			'PageDown': 'goPageDown',
			'Delete': 'delCharAfter',
			'Backspace': 'delCharBefore',
			'Shift-Backspace': 'delCharBefore',
			'Tab': 'smartListIndent',
			'Shift-Tab': 'smartListUnindent',
			'Enter': 'insertListElement',
			'Insert': 'toggleOverwrite',
			'Esc': 'singleSelection',
		};

		if (shim.isMac()) {
			CodeMirror.keyMap.default = {
				// MacOS
				'Cmd-A': 'selectAll',
				'Cmd-D': 'deleteLine',
				'Cmd-Z': 'undo',
				'Shift-Cmd-Z': 'redo',
				'Cmd-Y': 'redo',
				'Cmd-Home': 'goDocStart',
				'Cmd-Up': 'goDocStart',
				'Cmd-End': 'goDocEnd',
				'Cmd-Down': 'goDocEnd',
				'Cmd-Left': 'goLineLeft',
				'Cmd-Right': 'goLineRight',
				'Alt-Left': 'goGroupLeft',
				'Alt-Right': 'goGroupRight',
				'Alt-Backspace': 'delGroupBefore',
				'Alt-Delete': 'delGroupAfter',
				'Cmd-[': 'indentLess',
				'Cmd-]': 'indentMore',
				'Cmd-/': 'toggleComment',
				'Cmd-Opt-S': 'sortSelectedLines',
				'Opt-Up': 'swapLineUp',
				'Opt-Down': 'swapLineDown',

				'fallthrough': 'basic',
			};
		} else {
			CodeMirror.keyMap.default = {
				// Windows/linux
				'Ctrl-A': 'selectAll',
				'Ctrl-D': 'deleteLine',
				'Ctrl-Z': 'undo',
				'Shift-Ctrl-Z': 'redo',
				'Ctrl-Y': 'redo',
				'Ctrl-Home': 'goDocStart',
				'Ctrl-End': 'goDocEnd',
				'Ctrl-Up': 'goLineUp',
				'Ctrl-Down': 'goLineDown',
				'Ctrl-Left': 'goGroupLeft',
				'Ctrl-Right': 'goGroupRight',
				'Alt-Left': 'goLineStart',
				'Alt-Right': 'goLineEnd',
				'Ctrl-Backspace': 'delGroupBefore',
				'Ctrl-Delete': 'delGroupAfter',
				'Ctrl-[': 'indentLess',
				'Ctrl-]': 'indentMore',
				'Ctrl-/': 'toggleComment',
				'Ctrl-Alt-S': 'sortSelectedLines',
				'Alt-Up': 'swapLineUp',
				'Alt-Down': 'swapLineDown',

				'fallthrough': 'basic',
			};
		}
		setupEmacs();
		setupVim();
	}, []);
}
