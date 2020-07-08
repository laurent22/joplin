const fs = require('fs-extra');
const BaseService = require('lib/services/BaseService');
const { shim } = require('lib/shim.js');

class KeymapService extends BaseService {
	static readonly modifiers = /^(Command|Control|Ctrl|Cmd|Alt|Option|Shift|Shift|Super|CommandOrControl|CmdOrCtrl)$/;
	static readonly keyCodes = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;
	static readonly modifierWeights: { [modifier: string]: number } = shim.isMac()
		? { 'Ctrl': 0, 'Option': 1, 'Shift': 2, 'Cmd': 3, 'Super': 4 }
		: { 'Ctrl': 0, 'Alt': 1, 'AltGr': 2, 'Shift': 3, 'Super': 4 };

	private keymap: { [command: string]: KeymapItem };
	static readonly defaultKeymap = shim.isMac()
		? [
			// Keymap items with null "accelerator" property allows users to set their own Accelerators
			// i.e. { accelerator: null, command: 'someCommand' }
			{ accelerator: 'Cmd+N', command: 'newNote' },
			{ accelerator: 'Cmd+T', command: 'newTodo' },
			{ accelerator: 'Cmd+S', command: 'synchronize' },
			{ accelerator: 'Cmd+P', command: 'print' },
			{ accelerator: 'Cmd+H', command: 'hideApp' },
			{ accelerator: 'Cmd+Q', command: 'quit' },
			{ accelerator: 'Cmd+,', command: 'config' },
			{ accelerator: 'Cmd+W', command: 'closeWindow' },
			{ accelerator: 'Option+Cmd+I', command: 'insertTemplate' },
			{ accelerator: 'Cmd+C', command: 'textCopy' },
			{ accelerator: 'Cmd+X', command: 'textCut' },
			{ accelerator: 'Cmd+V', command: 'textPaste' },
			{ accelerator: 'Cmd+A', command: 'textSelectAll' },
			{ accelerator: 'Cmd+B', command: 'textBold' },
			{ accelerator: 'Cmd+I', command: 'textItalic' },
			{ accelerator: 'Cmd+K', command: 'textLink' },
			{ accelerator: 'Cmd+`', command: 'textCode' },
			{ accelerator: 'Shift+Cmd+T', command: 'insertDateTime' },
			{ accelerator: 'Shift+Cmd+F', command: 'focusSearch' },
			{ accelerator: 'Cmd+F', command: 'showLocalSearch' },
			{ accelerator: 'Shift+Cmd+S', command: 'focusElementSideBar' },
			{ accelerator: 'Shift+Cmd+L', command: 'focusElementNoteList' },
			{ accelerator: 'Shift+Cmd+N', command: 'focusElementNoteTitle' },
			{ accelerator: 'Shift+Cmd+B', command: 'focusElementNoteBody' },
			{ accelerator: 'Option+Cmd+S', command: 'toggleSidebar' },
			{ accelerator: 'Cmd+L', command: 'toggleVisiblePanes' },
			{ accelerator: 'Cmd+0', command: 'zoomActualSize' },
			{ accelerator: 'Cmd+E', command: 'startExternalEditing' },
			{ accelerator: 'Option+Cmd+T', command: 'setTags' },
			{ accelerator: 'Cmd+G', command: 'gotoAnything' },
			{ accelerator: 'F1', command: 'help' },
		] : [
			{ accelerator: 'Ctrl+N', command: 'newNote' },
			{ accelerator: 'Ctrl+T', command: 'newTodo' },
			{ accelerator: 'Ctrl+S', command: 'synchronize' },
			{ accelerator: 'Ctrl+P', command: 'print' },
			{ accelerator: 'Ctrl+Q', command: 'quit' },
			{ accelerator: 'Ctrl+Alt+I', command: 'insertTemplate' },
			{ accelerator: 'Ctrl+C', command: 'textCopy' },
			{ accelerator: 'Ctrl+X', command: 'textCut' },
			{ accelerator: 'Ctrl+V', command: 'textPaste' },
			{ accelerator: 'Ctrl+A', command: 'textSelectAll' },
			{ accelerator: 'Ctrl+B', command: 'textBold' },
			{ accelerator: 'Ctrl+I', command: 'textItalic' },
			{ accelerator: 'Ctrl+K', command: 'textLink' },
			{ accelerator: 'Ctrl+`', command: 'textCode' },
			{ accelerator: 'Ctrl+Shift+T', command: 'insertDateTime' },
			{ accelerator: 'F6', command: 'focusSearch' },
			{ accelerator: 'Ctrl+F', command: 'showLocalSearch' },
			{ accelerator: 'Ctrl+Shift+S', command: 'focusElementSideBar' },
			{ accelerator: 'Ctrl+Shift+L', command: 'focusElementNoteList' },
			{ accelerator: 'Ctrl+Shift+N', command: 'focusElementNoteTitle' },
			{ accelerator: 'Ctrl+Shift+B', command: 'focusElementNoteBody' },
			{ accelerator: 'F10', command: 'toggleSidebar' },
			{ accelerator: 'Ctrl+L', command: 'toggleVisiblePanes' },
			{ accelerator: 'Ctrl+0', command: 'zoomActualSize' },
			{ accelerator: 'Ctrl+E', command: 'startExternalEditing' },
			{ accelerator: 'Ctrl+Alt+T', command: 'setTags' },
			{ accelerator: 'Ctrl+,', command: 'config' },
			{ accelerator: 'Ctrl+G', command: 'gotoAnything' },
			{ accelerator: 'F1', command: 'help' },
		];

	constructor() {
		super();
		this.keymap = KeymapService.initKeymap();
	}

	async loadKeymap(keymapPath: string) {
		if (await fs.exists(keymapPath)) {
			this.logger().info(`Loading keymap: ${keymapPath}`);

			try {
				const keymapFile = await fs.readFile(keymapPath, 'utf-8');
				this.setKeymap(JSON.parse(keymapFile));
			} catch (err) {
				const msg = err.message ? err.message : '';
				throw new Error(`KeymapService: Failed to load the keymap at ${keymapPath}!\n${msg}`);
			}
		}
	}

	getAccelerator(command: string) {
		const item = this.keymap[command];

		if (!item) throw new Error(`KeymapService: "${command}" command does not exist!`);
		else return item.accelerator;
	}

	setAccelerator(command: string, accelerator: string) {
		// Run through localizeAccelerator() to detect duplicates with high accuracy
		this.keymap[command].accelerator = KeymapService.localizeAccelerator(accelerator);
	}

	resetAccelerator(command: string) {
		const defaultItem = KeymapService.defaultKeymap.find((item => item.command === command));

		if (!defaultItem) throw new Error(`KeymapService: "${command}" command does not exist!`);
		else this.setAccelerator(command, defaultItem.accelerator);
	}

	getKeymap() {
		const defaultItemsByCommand = KeymapService.initKeymap();

		// Compare each "accelerator" value of the current keymap with the default values
		// Return a keymap object, which can later be converted to a string and saved to the disk
		return Object.entries(this.keymap).reduce((customKeymap, [command, { accelerator }]) => {
			// If the Accelerator has been changed, add into the customKeymap object
			if (defaultItemsByCommand[command].accelerator !== accelerator) {
				customKeymap.push({ command, accelerator });
			}
			return customKeymap;
		}, []);
	}

	setKeymap(customKeymap: KeymapItem[]) {
		for (let i = 0; i < customKeymap.length; i++) {
			const item = customKeymap[i];

			try {
				this.validateKeymapItem(item); // Throws if there are any issues in the keymap item
				this.setAccelerator(item.command, item.accelerator);
			} catch (err) {
				throw new Error(
					`Keymap item ${JSON.stringify(item)} is invalid!\nReason: ${err.message}`
				);
			}
		}

		try {
			this.validateKeymap(); // Throws whenever there are duplicate Accelerators used in the keymap
		} catch (err) {
			this.resetKeymap();
			throw new Error(
				`Keymap configuration contains duplicates!\n${err.message}`
			);
		}
	}

	resetKeymap() {
		this.keymap = KeymapService.initKeymap();
	}

	private validateKeymapItem(item: KeymapItem) {
		const commandReference = 'https://github.com/laurent22/joplin/blob/master/README.md';
		const acceleratorReference = 'https://www.electronjs.org/docs/api/accelerator';

		if (!item.hasOwnProperty('command')) {
			throw new Error(
				'Couldn\'t find the "command" property.\n\n' +
				`Visit ${commandReference} to see the list of available commands.`
			);
		} else if (!this.keymap.hasOwnProperty(item.command)) {
			throw new Error(
				`"${item.command}" is not a valid command.\n\n` +
				`Visit ${commandReference} to see the list of available commands.`
			);
		}

		if (!item.hasOwnProperty('accelerator')) {
			throw new Error(
				'Couldn\'t find the "accelerator" property.\n\n' +
				`Visit ${acceleratorReference} to learn more about Electron Accelerators.`
			);
		} else if (!(item.accelerator === null || KeymapService.isAccelerator(item.accelerator))) {
			throw new Error(
				`"${item.accelerator}" is not a valid Accelerator.\n\n` +
				`Visit ${acceleratorReference} to learn more about Electron Accelerators.`
			);
		}
	}

	private validateKeymap() {
		const usedAccelerators = new Set();

		for (const item of Object.values(this.keymap)) {
			const itemAccelerator = item.accelerator;

			if (usedAccelerators.has(itemAccelerator)) {
				const originalItem = Object.values(this.keymap).find(_item => _item.accelerator == item.accelerator);

				throw new Error(
					`Accelerator "${itemAccelerator}" can't be used for "${item.command}" command ` +
					`because it's already used for "${originalItem.command}" command!\n\n` +
					'You have to change the Accelerator for any of above commands.'
				);
			} else if (itemAccelerator !== null) {
				usedAccelerators.add(itemAccelerator);
			}
		}
	}

	static initKeymap() {
		const itemsByCommand: { [command: string]: KeymapItem } = {};
		for (let i = 0; i < KeymapService.defaultKeymap.length; i++) {
			// Make a copy of the KeymapItem before assigning it, hence the spread operator
			// Otherwise we're going to mess up the defaultKeymap array
			itemsByCommand[KeymapService.defaultKeymap[i].command] = { ...KeymapService.defaultKeymap[i] };
		}

		return itemsByCommand;
	}

	static isAccelerator(accelerator: string) {
		let keyFound = false;
		const parts = accelerator.split('+');

		return parts.every((part, index) => {
			const isKey = KeymapService.keyCodes.test(part);
			const isModifier = KeymapService.modifiers.test(part);

			if (isKey) {
				// Key must be unique
				if (keyFound) return false;
				keyFound = true;
			}

			// Key is required
			if (index === (parts.length - 1) && !keyFound) return false;
			return isKey || isModifier;
		});
	}

	static localizeAccelerator(accelerator: string) {
		return accelerator === null
			? null
			: accelerator
				// Allow usage of all modifiers for the sake of compatibility
				// But only use one type of modifiers to improve duplicate detection
				.replace(/(CommandOrControl|CmdOrCtrl)/i, shim.isMac() ? 'Cmd' : 'Ctrl')
				.replace(/(Command)/i, 'Cmd')
				.replace(/(Control)/i, 'Ctrl')
				.replace(/(Alt|Option)/i, shim.isMac() ? 'Option' : 'Alt')
				// Reorder components so that "Option+Shift+Cmd+X" and "Shift+Option+Cmd+X" will be the same
				.split('+')
				.sort((a, b) => KeymapService.getWeight(a) - KeymapService.getWeight(b))
				.join('+');
	}

	static getWeight(modifier: string) {
		return KeymapService.modifierWeights.hasOwnProperty(modifier)
			? KeymapService.modifierWeights[modifier]
			: /* Maximum weight */ 5;
	}

	static instance() {
		if (this.instance_) return this.instance_;

		this.instance_ = new KeymapService();
		return this.instance_;
	}
}

interface KeymapItem {
	accelerator: string;
	command: string;
}

export = KeymapService;
