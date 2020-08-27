import { KeyboardEvent } from 'react';

const fs = require('fs-extra');
const BaseService = require('lib/services/BaseService');
const eventManager = require('lib/eventManager');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');

const keysRegExp = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;
const modifiersRegExp = {
	darwin: /^(Ctrl|Option|Shift|Cmd)$/,
	default: /^(Ctrl|Alt|AltGr|Shift|Super)$/,
};

const defaultKeymap = {
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

export class KeymapError extends Error {
	// Translated error message for the GUI
	private altMessage_: string;

	constructor(message: string, altMessage: string) {
		super(message);
		this.altMessage_ = altMessage;
	}

	get altMessage() {
		return this.altMessage_;
	}
}

export interface KeymapItem {
	accelerator: string;
	command: string;
}

interface Keymap {
	[command: string]: KeymapItem;
}

export default class KeymapService extends BaseService {
	private keymap: Keymap;
	private defaultKeymap: KeymapItem[];
	private platform: string;
	private keymapPath: string;

	constructor() {
		super();

		// Automatically initialize for the current platform
		this.initialize();
	}

	initialize(platform: string = shim.platformName()) {
		this.platform = platform;

		switch (platform) {
		case 'darwin':
			this.defaultKeymap = defaultKeymap.darwin;
			this.modifiersRegExp = modifiersRegExp.darwin;
			break;
		default:
			this.defaultKeymap = defaultKeymap.default;
			this.modifiersRegExp = modifiersRegExp.default;
		}

		this.keymap = {};
		for (let i = 0; i < this.defaultKeymap.length; i++) {
			// Make a copy of the KeymapItem before assigning it
			// Otherwise we're going to mess up the defaultKeymap array
			this.keymap[this.defaultKeymap[i].command] = { ...this.defaultKeymap[i] };
		}
	}

	public on(eventName: string, callback: Function) {
		eventManager.on(eventName, callback);
	}

	public off(eventName: string, callback: Function) {
		eventManager.off(eventName, callback);
	}

	async loadKeymap(keymapPath: string) {
		this.keymapPath = keymapPath; // For saving the changes later

		if (await fs.exists(keymapPath)) {
			this.logger().info(`KeymapService: Loading keymap: ${keymapPath}`);
			try {
				const keymapFile = await shim.fsDriver().readFile(keymapPath, 'utf-8');
				this.setKeymap(JSON.parse(keymapFile));
			} catch (err) {
				const message = err.message ? err.message : '';
				throw new Error(`Failed to load keymap: ${keymapPath}\n${message}`);
			}
		}
	}

	async saveKeymap() {
		this.logger().info(`KeymapService: Saving keymap: ${this.keymapPath}`);

		try {
			const customKeymap = this.generateCustomKeymap();
			await shim.fsDriver().writeFile(this.keymapPath, JSON.stringify(customKeymap, null, 2), 'utf-8');
			// Refresh the menu items
			eventManager.emit('keymapChange');
		} catch (err) {
			const message = err.message ? err.message : '';
			throw new Error(`Failed to save keymap: ${this.keymapPath}\n${message}`);
		}
	}

	hasAccelerator(command: string) {
		return !!this.keymap[command];
	}

	getAccelerator(command: string) {
		const item = this.keymap[command];

		if (!item) throw new Error(`KeymapService: "${command}" command does not exist!`);
		else return item.accelerator;
	}

	setAccelerator(command: string, accelerator: string) {
		this.keymap[command].accelerator = accelerator;
	}

	resetAccelerator(command: string) {
		const defaultItem = this.defaultKeymap.find((item => item.command === command));

		if (!defaultItem) throw new Error(`KeymapService: "${command}" command does not exist!`);
		else this.setAccelerator(command, defaultItem.accelerator);
	}

	getDefaultAccelerator(command: string) {
		const defaultItem = this.defaultKeymap.find((item => item.command === command));

		if (!defaultItem) throw new Error(`KeymapService: "${command}" command does not exist!`);
		else return defaultItem.accelerator;
	}

	setKeymap(customKeymap: KeymapItem[]) {
		for (let i = 0; i < customKeymap.length; i++) {
			const item = customKeymap[i];

			// Throws if there are any issues in the keymap item
			this.validateKeymapItem(item);
			this.setAccelerator(item.command, item.accelerator);
		}

		// Throws whenever there are duplicate Accelerators used in the keymap
		this.validateKeymap();
	}

	getKeymap() {
		return Object.values(this.keymap);
	}

	getCommandNames() {
		return Object.keys(this.keymap);
	}

	generateCustomKeymap() {
		const customKeymap: KeymapItem[] = [];
		this.defaultKeymap.forEach(({ command, accelerator }) => {
			const currentAccelerator = this.getAccelerator(command);
			if (this.getAccelerator(command) !== accelerator) {
				customKeymap.push({ command, accelerator: currentAccelerator });
			}
		});

		return customKeymap;
	}

	private validateKeymapItem(item: KeymapItem) {
		if (!item.hasOwnProperty('command')) {
			throw new Error(`Keymap item ${JSON.stringify(item)} is invalid because "command" property is missing.`);
		} else if (!this.keymap.hasOwnProperty(item.command)) {
			throw new Error(`Keymap item ${JSON.stringify(item)} is invalid because "${item.command}" is not a valid command.`);
		}

		if (!item.hasOwnProperty('accelerator')) {
			throw new Error(`Keymap item ${JSON.stringify(item)} is invalid because "accelerator" property is missing.`);
		} else if (item.accelerator !== null) {
			try {
				this.validateAccelerator(item.accelerator);
			} catch {
				throw new Error(`Keymap item ${JSON.stringify(item)} is invalid because "${item.accelerator}" is not a valid accelerator.`);
			}
		}
	}

	validateKeymap(newItem: KeymapItem = null) {
		const usedAccelerators = new Set();
		if (newItem) usedAccelerators.add(newItem.accelerator);

		for (const item of Object.values(this.keymap)) {
			const [itemAccelerator, itemCommand] = [item.accelerator, item.command];
			if (newItem && itemCommand === newItem.command) continue;

			if (usedAccelerators.has(item.accelerator)) {
				const originalItem = Object.values(this.keymap).find(_item => _item.accelerator == item.accelerator);
				throw new KeymapError(
					'Keymap configuration contains one or more duplicates.\n' +
					`Accelerator "${item.accelerator}" can't be used for both "${item.command}" and "${originalItem.command}" commands.\n` +
					'You have to change the accelerator for any of above commands.',
					_('Keymap configuration contains one or more duplicate keyboard shortcuts. This may lead to unexpected behaviour.')
				);
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

		if (!isValid) throw new Error(`Accelerator invalid: ${accelerator}`);
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

	static instance() {
		if (this.instance_) return this.instance_;

		this.instance_ = new KeymapService();
		return this.instance_;
	}
}
