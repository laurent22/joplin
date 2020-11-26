import { useEffect } from 'react';
import CommandService, { CommandDeclaration } from '@joplin/lib/services/CommandService';
import KeymapService, { KeymapItem } from '@joplin/lib/services/KeymapService';
import { CodeMirrorKey } from './types';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';

export default function useKeymap(CodeMirror: any, pluginKeys: CodeMirrorKey[]) {

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

	// Because there is sometimes a clash between these keybindings and the Joplin window ones
	// (This specifically can happen with the Ctrl-B and Ctrl-I keybindings when
	// codemirror is in contenteditable mode)
	// we will register all keypresses with the codemirror editor to guarentee they
	// work no matter where the focus is
	function registerJoplinCommand(key: KeymapItem) {
		if (!key.command || !key.accelerator) return;

		let command = '';
		if (key.command.indexOf('editor.codemirror') == 0) {
			command = key.command.slice(18); // 18 is the length of editor.codemirror.
		} else {
			// We need to register Joplin commands with codemirror
			command = `joplin${key.command}`;
			// Not all commands are registered with the command service
			// This check will ensure that codemirror only takesover the commands that are
			// see gui/KeymapConfig/getLabel.ts for more information
			const commandNames = CommandService.instance().commandNames();
			if (commandNames.includes(key.command)) {
				CodeMirror.commands[command] = () => {
					CommandService.instance().execute(key.command);
				};
			}
		}

		CodeMirror.keyMap.default[key.accelerator.replace(/\+/g, '-')] = command;
	}

	// Called on initialization, and whenever the keymap changes
	function registerEntireKeymap() {
		const keymapItems = KeymapService.instance().getKeymapItems();
		// Register all commands with the codemirror editor
		keymapItems.forEach((key) => { registerJoplinCommand(key); });
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

		const defaultKeymap: CodeMirrorKey[] = [
			// Windows/linux
			{ label: _('Delete line'), command: 'editor.codemirror.deleteLine', default: 'Ctrl+D', macos: 'Cmd+D' },
			{ label: _('Undo'), command: 'editor.codemirror.undo', default: 'Ctrl+Z', macos: 'Cmd+Z' },
			{ label: _('Redo'), command: 'editor.codemirror.redo', default: 'Shift+Ctrl+Z', macos: 'Shift+Cmd+Z' },
			{ label: _('Redo'), command: 'editor.codemirror.redo', default: 'Ctrl+Y', macos: 'Cmd+Y' },
			{ label: _('Go to beginning of note'), command: 'editor.codemirror.goDocStart', default: 'Ctrl+Home', macos: 'Cmd+Home' },
			{ label: _('Go to end of note'), command: 'editor.codemirror.goDocEnd', default: 'Ctrl+End', macos: 'Cmd+Up' },
			{ label: _('Go up a line'), command: 'editor.codemirror.goLineUp', default: 'Ctrl+Up', macos: 'Cmd+End' },
			{ label: _('Go down a line'), command: 'editor.codemirror.goLineDown', default: 'Ctrl+Down', macos: 'Cmd+Down' },
			{ label: _('Go group left'), command: 'editor.codemirror.goGroupLeft', default: 'Ctrl+Left', macos: 'Cmd+Left' },
			{ label: _('Go group right'), command: 'editor.codemirror.goGroupRight', default: 'Ctrl+Right', macos: 'Cmd+Right' },
			{ label: _('Go to line start'), command: 'editor.codemirror.goLineStart', default: 'Alt+Left', macos: 'Alt+Left' },
			{ label: _('Go to line end'), command: 'editor.codemirror.goLineEnd', default: 'Alt+Right', macos: 'Alt+Right' },
			{ label: _('Delete group before'), command: 'editor.codemirror.delGroupBefore', default: 'Ctrl+Backspace', macos: 'Alt+Backspace' },
			{ label: _('Delete group after'), command: 'editor.codemirror.delGroupAfter', default: 'Ctrl+Delete', macos: 'Alt+Delete' },
			{ label: _('Indent less'), command: 'editor.codemirror.indentLess', default: 'Ctrl+[', macos: 'Cmd+[' },
			{ label: _('Indent more'), command: 'editor.codemirror.indentMore', default: 'Ctrl+]', macos: 'Cmd+]' },
			{ label: _('Toggle comment'), command: 'editor.codemirror.toggleComment', default: 'Ctrl+/', macos: 'Cmd+/' },
			{ label: _('Sort selected lines'), command: 'editor.codemirror.sortSelectedLines', default: 'Ctrl+Alt+S', macos: 'Cmd+Opt+S' },
			{ label: _('Swap line up'), command: 'editor.codemirror.swapLineUp', default: 'Alt+Up', macos: 'Opt+Up' },
			{ label: _('Swap line down'), command: 'editor.codemirror.swapLineDown', default: 'Alt+Down', macos: 'Opt+Down' },
		].concat(pluginKeys);

		CodeMirror.keyMap.default = { 'fallthrough': 'basic' };

		const keymapService = KeymapService.instance();
		const commandNames = keymapService.getCommandNames();

		for (let i = 0; i < defaultKeymap.length; i++) {
			const key = defaultKeymap[i];

			const dec: CommandDeclaration = { name: key.command, label: key.label };
			CommandService.instance().registerDeclaration(dec);

			const accelerator = shim.isMac() ? key.macos : key.default;
			if (!commandNames.includes(key.command)) { keymapService.registerCommandAccelerator(key.command, accelerator); }
		}

		registerEntireKeymap();
		keymapService.on('keymapChange', registerEntireKeymap);

		setupEmacs();
		setupVim();
	}, [pluginKeys]);
}
