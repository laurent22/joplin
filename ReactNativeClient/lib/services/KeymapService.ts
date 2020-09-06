import { KeyboardEvent } from 'react';

const BaseService = require('lib/services/BaseService');
const eventManager = require('lib/eventManager');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');

const keysRegExp = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;
const modifiersRegExp = {
	darwin: /^(Ctrl|Option|Shift|Cmd)$/,
	default: /^(Ctrl|Alt|AltGr|Shift|Super)$/,
};

const defaultKeymapItems = {
	darwin: [
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
	],
	default: [
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
	],
};

export interface KeymapItem {
	accelerator: string;
	command: string;
}

interface Keymap {
	[command: string]: KeymapItem;
}

export default class KeymapService extends BaseService {
	private keymap: Keymap;
	private platform: string;
	private customKeymapPath: string;
	private defaultKeymapItems: KeymapItem[];

	constructor() {
		super();

		// By default, initialize for the current platform
		// Manual initialization allows testing for other platforms
		this.initialize();
	}

	initialize(platform: string = shim.platformName()) {
		this.platform = platform;

		switch (platform) {
		case 'darwin':
			this.defaultKeymapItems = defaultKeymapItems.darwin;
			this.modifiersRegExp = modifiersRegExp.darwin;
			break;
		default:
			this.defaultKeymapItems = defaultKeymapItems.default;
			this.modifiersRegExp = modifiersRegExp.default;
		}

		this.keymap = {};
		for (let i = 0; i < this.defaultKeymapItems.length; i++) {
			// Keep the original defaultKeymapItems array untouched
			// Makes it possible to retrieve the original accelerator later, if needed
			this.keymap[this.defaultKeymapItems[i].command] = { ...this.defaultKeymapItems[i] };
		}
	}

	async loadCustomKeymap(customKeymapPath: string) {
		this.customKeymapPath = customKeymapPath; // Useful for saving the changes later

		if (await shim.fsDriver().exists(customKeymapPath)) {
			this.logger().info(`KeymapService: Loading keymap from file: ${customKeymapPath}`);

			try {
				const customKeymapFile = await shim.fsDriver().readFile(customKeymapPath, 'utf-8');
				// Custom keymaps are supposed to contain an array of keymap items
				this.overrideKeymap(JSON.parse(customKeymapFile));
			} catch (err) {
				const message = err.message || '';
				throw new Error(`${_('Error loading the keymap from file: %s', customKeymapPath)}\n${message}`);
			}
		}
	}

	async saveCustomKeymap(customKeymapPath: string = this.customKeymapPath) {
		this.logger().info(`KeymapService: Saving keymap to file: ${customKeymapPath}`);

		try {
			// Only the customized keymap items should be saved to the disk
			const customKeymapItems = this.getCustomKeymapItems();
			await shim.fsDriver().writeFile(customKeymapPath, JSON.stringify(customKeymapItems, null, 2), 'utf-8');

			// Refresh the menu items so that the changes are reflected
			eventManager.emit('keymapChange');
		} catch (err) {
			const message = err.message || '';
			throw new Error(`${_('Error saving the keymap to file: %s', customKeymapPath)}\n${message}`);
		}
	}

	acceleratorExists(command: string) {
		return !!this.keymap[command];
	}

	setAccelerator(command: string, accelerator: string) {
		this.keymap[command].accelerator = accelerator;
	}

	getAccelerator(command: string) {
		const item = this.keymap[command];
		if (!item) throw new Error(`KeymapService: "${command}" command does not exist!`);

		return item.accelerator;
	}

	getDefaultAccelerator(command: string) {
		const defaultItem = this.defaultKeymapItems.find((item => item.command === command));
		if (!defaultItem) throw new Error(`KeymapService: "${command}" command does not exist!`);

		return defaultItem.accelerator;
	}

	getCommandNames() {
		return Object.keys(this.keymap);
	}

	getKeymapItems() {
		return Object.values(this.keymap);
	}

	getCustomKeymapItems() {
		const customkeymapItems: KeymapItem[] = [];
		this.defaultKeymapItems.forEach(({ command, accelerator }) => {
			const currentAccelerator = this.getAccelerator(command);

			// Only the customized/changed keymap items are neccessary for the custom keymap
			// Customizations can be merged with the original keymap at the runtime
			if (this.getAccelerator(command) !== accelerator) {
				customkeymapItems.push({ command, accelerator: currentAccelerator });
			}
		});

		return customkeymapItems;
	}

	getDefaultKeymapItems() {
		return [...this.defaultKeymapItems];
	}

	overrideKeymap(customKeymapItems: KeymapItem[]) {
		try {
			for (let i = 0; i < customKeymapItems.length; i++) {
				const item = customKeymapItems[i];
				// Validate individual custom keymap items
				// Throws if there are any issues in the keymap item
				this.validateKeymapItem(item);
				this.setAccelerator(item.command, item.accelerator);
			}

			// Validate the entire keymap for duplicates
			// Throws whenever there are duplicate Accelerators used in the keymap
			this.validateKeymap();
		} catch (err) {
			this.initialize(); // Discard all the changes if there are any issues
			throw err;
		}
	}

	private validateKeymapItem(item: KeymapItem) {
		if (!item.hasOwnProperty('command')) {
			throw new Error(_('Keymap item %s is missing the required "command" property.', JSON.stringify(item)));
		} else if (!this.keymap.hasOwnProperty(item.command)) {
			throw new Error(_('Keymap item %s is invalid because %s is not a valid command.', JSON.stringify(item), item.command));
		}

		if (!item.hasOwnProperty('accelerator')) {
			throw new Error(_('Keymap item %s is missing the required "accelerator" property.', JSON.stringify(item)));
		} else if (item.accelerator !== null) {
			try {
				this.validateAccelerator(item.accelerator);
			} catch {
				throw new Error(_('Keymap item %s is invalid because %s is not a valid accelerator.', JSON.stringify(item), item.accelerator));
			}
		}
	}

	validateKeymap(proposedKeymapItem: KeymapItem = null) {
		const usedAccelerators = new Set();

		// Validate as if the proposed change is already present in the current keymap
		// Helpful for detecting any errors that'll occur, when the proposed change is performed on the keymap
		if (proposedKeymapItem) usedAccelerators.add(proposedKeymapItem.accelerator);

		for (const item of Object.values(this.keymap)) {
			const [itemAccelerator, itemCommand] = [item.accelerator, item.command];
			if (proposedKeymapItem && itemCommand === proposedKeymapItem.command) continue; // Ignore the original accelerator

			if (usedAccelerators.has(itemAccelerator)) {
				const originalItem = (proposedKeymapItem && proposedKeymapItem.accelerator === itemAccelerator)
					? proposedKeymapItem
					: Object.values(this.keymap).find(_item => _item.accelerator == itemAccelerator);

				throw new Error(_(
					'Accelerator "%s" is used for "%s" and "%s" commands. This may lead to unexpected behaviour.',
					itemAccelerator,
					originalItem.command,
					itemCommand
				));
			} else if (itemAccelerator) {
				usedAccelerators.add(itemAccelerator);
			}
		}
	}

	validateAccelerator(accelerator: string) {
		let keyFound = false;

		const parts = accelerator.split('+');
		const isValid = parts.every((part, index) => {
			const isKey = keysRegExp.test(part);
			const isModifier = this.modifiersRegExp.test(part);

			if (isKey) {
				// Key must be unique
				if (keyFound) return false;
				keyFound = true;
			}

			// Key is required
			if (index === (parts.length - 1) && !keyFound) return false;
			return isKey || isModifier;
		});

		if (!isValid) throw new Error(_('Accelerator "%s" is not valid.', accelerator));
	}

	domToElectronAccelerator(event: KeyboardEvent<HTMLDivElement>) {
		const parts = [];
		const { key, ctrlKey, metaKey, altKey, shiftKey } = event;

		// First, the modifiers
		if (ctrlKey) parts.push('Ctrl');
		switch (this.platform) {
		case 'darwin':
			if (altKey) parts.push('Option');
			if (shiftKey) parts.push('Shift');
			if (metaKey) parts.push('Cmd');
			break;
		default:
			if (altKey) parts.push('Alt');
			if (shiftKey) parts.push('Shift');
		}

		// Finally, the key
		const electronKey = KeymapService.domToElectronKey(key);
		if (electronKey) parts.push(electronKey);

		return parts.join('+');
	}

	static domToElectronKey(domKey: string) {
		let electronKey;

		if (/^([a-z])$/.test(domKey)) {
			electronKey = domKey.toUpperCase();
		} else if (/^Arrow(Up|Down|Left|Right)|Audio(VolumeUp|VolumeDown|VolumeMute)$/.test(domKey)) {
			electronKey = domKey.slice(5);
		} else {
			switch (domKey) {
			case ' ':
				electronKey = 'Space';
				break;
			case '+':
				electronKey = 'Plus';
				break;
			case 'MediaTrackNext':
				electronKey = 'MediaNextTrack';
				break;
			case 'MediaTrackPrevious':
				electronKey = 'MediaPreviousTrack';
				break;
			default:
				electronKey = domKey;
			}
		}

		if (keysRegExp.test(electronKey)) return electronKey;
		else return null;
	}

	public on(eventName: string, callback: Function) {
		eventManager.on(eventName, callback);
	}

	public off(eventName: string, callback: Function) {
		eventManager.off(eventName, callback);
	}

	static instance() {
		if (this.instance_) return this.instance_;

		this.instance_ = new KeymapService();
		return this.instance_;
	}
}
