import { useEffect } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import KeymapService, { KeymapItem } from '@joplin/lib/services/KeymapService';
import { EditorCommand } from '../../../utils/types';
import shim from '@joplin/lib/shim';
import { reg } from '@joplin/lib/registry';

export default function useKeymap(CodeMirror: any) {

	function save() {
		void CommandService.instance().execute('synchronize');
	}

	function setupEmacs() {
		CodeMirror.keyMap.emacs['Tab'] = 'smartListIndent';
		CodeMirror.keyMap.emacs['Enter'] = 'insertListElement';
		CodeMirror.keyMap.emacs['Shift-Tab'] = 'smartListUnindent';
	}

	function setupVim() {
		CodeMirror.Vim.defineAction('swapLineDown', CodeMirror.commands.swapLineDown);
		CodeMirror.Vim.mapCommand('<A-j>', 'action', 'swapLineDown', {}, { context: 'normal', isEdit: true });
		CodeMirror.Vim.defineAction('swapLineUp', CodeMirror.commands.swapLineUp);
		CodeMirror.Vim.mapCommand('<A-k>', 'action', 'swapLineUp', {}, { context: 'normal', isEdit: true });
		CodeMirror.Vim.defineAction('insertListElement', CodeMirror.commands.vimInsertListElement);
		CodeMirror.Vim.mapCommand('o', 'action', 'insertListElement', { after: true }, { context: 'normal', isEdit: true, interlaceInsertRepeat: true });
	}
	function isEditorCommand(command: string) {
		return command.startsWith('editor.');
	}

	// Converts a command of the form editor.command to just command
	function editorCommandToCodeMirror(command: string) {
		return command.slice(7); // 7 is the length of editor.
	}

	// CodeMirror and Electron register accelerators slightly different
	// CodeMirror requires a - between keys while Electron want's a +
	// CodeMirror doesn't recognize Option (it uses Alt instead)
	// CodeMirror requires Shift to be first
	function normalizeAccelerator(accelerator: string) {
		const command = accelerator.replace(/\+/g, '-').replace('Option', 'Alt');
		// From here is taken out of codemirror/lib/codemirror.js
		const parts = command.split(/-(?!$)/);

		let name = parts[parts.length - 1];
		let alt, ctrl, shift, cmd;
		for (let i = 0; i < parts.length - 1; i++) {
			const mod = parts[i];
			if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; } else if (/^a(lt)?$/i.test(mod)) { alt = true; } else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; } else if (/^s(hift)?$/i.test(mod)) { shift = true; } else { throw new Error(`Unrecognized modifier name: ${mod}`); }
		}
		if (alt) { name = `Alt-${name}`; }
		if (ctrl) { name = `Ctrl-${name}`; }
		if (cmd) { name = `Cmd-${name}`; }
		if (shift) { name = `Shift-${name}`; }
		return name;
		// End of code taken from codemirror/lib/codemirror.js
	}

	// Because there is sometimes a clash between these keybindings and the Joplin window ones
	// (This specifically can happen with the Ctrl-B and Ctrl-I keybindings when
	// codemirror is in contenteditable mode)
	// we will register all keypresses with the codemirror editor to guarentee they
	// work no matter where the focus is
	function registerJoplinCommand(key: KeymapItem) {
		if (!key.command || !key.accelerator) return;

		let command = '';
		// We need to register Joplin commands with codemirror
		command = `joplin${key.command}`;
		// Not all commands are registered with the command service
		// (for example, the Quit command)
		// This check will ensure that codemirror only takesover the commands that are
		// see gui/KeymapConfig/getLabel.ts for more information
		const commandNames = CommandService.instance().commandNames();
		if (commandNames.includes(key.command)) {
			CodeMirror.commands[command] = () => {
				void CommandService.instance().execute(key.command);
			};
		}

		// CodeMirror and Electron have slightly different formats for defining accelerators
		const acc = normalizeAccelerator(key.accelerator);

		CodeMirror.keyMap.default[acc] = command;
	}

	// Called on initialization, and whenever the keymap changes
	function registerKeymap() {
		const keymapItems = KeymapService.instance().getKeymapItems();
		// Register all commands with the codemirror editor
		// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
		keymapItems.forEach((key) => { registerJoplinCommand(key); });
	}


	CodeMirror.defineExtension('supportsCommand', (cmd: EditorCommand) => {
		return isEditorCommand(cmd.name) && editorCommandToCodeMirror(cmd.name) in CodeMirror.commands;
	});

	// Used when an editor command is executed using the CommandService.instance().execute
	// function (rather than being initiated by a keypress in the editor)
	CodeMirror.defineExtension('execCommandFromJoplin', function(cmd: EditorCommand) {
		if (cmd.value) {
			reg.logger().warn('CodeMirror commands cannot accept a value:', cmd);
		}

		return this.execCommand(editorCommandToCodeMirror(cmd.name));
	});

	useEffect(() => {
		// This enables the special modes (emacs and vim) to initiate sync by the save action
		CodeMirror.commands.save = save;

		CodeMirror.keyMap.basic = {
			'Left': 'goCharLeft',
			'Right': 'goCharRight',
			'Up': 'goLineUpSmart',
			'Down': 'goLineDownSmart',
			'End': 'goLineRightSmart',
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

		// Some keybindings are added here and not to the global registry because users
		// often expect multiple keys to bind to the same command for example, redo is mapped to
		// both Ctrl+Shift+Z AND Ctrl+Y
		// Doing this mapping here will make those commands available but will allow users to
		// override them using the KeymapService
		CodeMirror.keyMap.default = {
			// Windows / Linux
			'Ctrl-Z': 'undo',
			'Shift-Ctrl-Z': 'redo',
			'Ctrl-Y': 'redo',
			'Ctrl-Up': 'goLineUpSmart',
			'Ctrl-Down': 'goLineDownSmart',
			'Ctrl-Home': 'goDocStart',
			'Ctrl-End': 'goDocEnd',
			'Ctrl-Left': 'goGroupLeft',
			'Ctrl-Right': 'goGroupRight',
			'Alt-Left': 'goLineStart',
			'Alt-Right': 'goLineEnd',
			'Ctrl-Backspace': 'delGroupBefore',
			'Ctrl-Delete': 'delGroupAfter',

			'fallthrough': 'basic',
		};
		if (shim.isMac()) {
			CodeMirror.keyMap.default = {
				// macOS
				'Shift-Cmd-Z': 'redo',
				'Cmd-Y': 'redo',
				'Cmd-End': 'goDocEnd',
				'Cmd-Down': 'goDocEnd',
				'Cmd-Home': 'goDocStart',
				'Cmd-Up': 'goDocStart',
				'Ctrl-D': 'delCharAfter',
				'Alt-Left': 'goGroupLeft',
				'Alt-Right': 'goGroupRight',
				'Ctrl-A': 'goLineStart',
				'Ctrl-E': 'goLineEnd',
				'Cmd-Left': 'goLineLeftSmart',
				'Cmd-Right': 'goLineRightSmart',
				'Alt-Backspace': 'delGroupBefore',
				'Alt-Delete': 'delGroupAfter',
				'Cmd-Backspace': 'delWrappedLineLeft',

				'fallthrough': 'basic',
			};
		}

		const keymapService = KeymapService.instance();

		registerKeymap();
		keymapService.on('keymapChange', registerKeymap);

		setupEmacs();
		setupVim();
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);
}
