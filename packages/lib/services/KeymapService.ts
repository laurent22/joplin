import eventManager from '../eventManager';
import shim from '../shim';
import { _ } from '../locale';

const BaseService = require('./BaseService').default;

const keysRegExp = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen|Numlock|Scrolllock|Capslock|num([0-9]|dec|add|sub|mult|div))$/;
const modifiersRegExp = {
	darwin: /^(Ctrl|Option|Shift|Cmd)$/,
	default: /^(Ctrl|Alt|AltGr|Shift|Super)$/,
};

const keycodeToElectronMap = [
	'',                      // [0]
	'',                      // [1]
	'',                      // [2]
	'',                      // [3]
	'',                      // [4]
	'',                      // [5]
	'',                      // [6]
	'',                      // [7]
	'Backspace',             // [8]
	'Tab',                   // [9]
	'',                      // [10]
	'',                      // [11]
	'Clear',                 // [12]
	'Enter',                 // [13]
	'',                      // [14]
	'',                      // [15]
	'Shift',                 // [16]
	'Ctrl',                  // [17]
	'Alt',                   // [18]
	'',                      // [19]
	'Capslock',              // [20]
	'',                      // [21]
	'',                      // [22]
	'',                      // [23]
	'',                      // [24]
	'',                      // [25]
	'',                      // [26]
	'Esc',                   // [27]
	'',                      // [28]
	'',                      // [29]
	'',                      // [30]
	'',                      // [31]
	'Space',                 // [32]
	'PageUp',                // [33]
	'PageDown',              // [34]
	'End',                   // [35]
	'Home',                  // [36]
	'Left',                  // [37]
	'Up',                    // [38]
	'Right',                 // [39]
	'Down',                  // [40]
	'',                      // [41]
	'',                      // [42]
	'',                      // [43]
	'PrintScreen',           // [44]
	'Insert',                // [45]
	'Delete',                // [46]
	'',                      // [47]
	'0',                     // [48]
	'1',                     // [49]
	'2',                     // [50]
	'3',                     // [51]
	'4',                     // [52]
	'5',                     // [53]
	'6',                     // [54]
	'7',                     // [55]
	'8',                     // [56]
	'9',                     // [57]
	':',                     // [58]
	';',                     // [59]
	'<',                     // [60]
	'=',                     // [61]
	'>',                     // [62]
	'?',                     // [63]
	'@',                     // [64]
	'A',                     // [65]
	'B',                     // [66]
	'C',                     // [67]
	'D',                     // [68]
	'E',                     // [69]
	'F',                     // [70]
	'G',                     // [71]
	'H',                     // [72]
	'I',                     // [73]
	'J',                     // [74]
	'K',                     // [75]
	'L',                     // [76]
	'M',                     // [77]
	'N',                     // [78]
	'O',                     // [79]
	'P',                     // [80]
	'Q',                     // [81]
	'R',                     // [82]
	'S',                     // [83]
	'T',                     // [84]
	'U',                     // [85]
	'V',                     // [86]
	'W',                     // [87]
	'X',                     // [88]
	'Y',                     // [89]
	'Z',                     // [90]
	'Super',                 // [91] Super: Windows Key (Windows) or Command Key (Mac)
	'',                      // [92]
	'ContextMenu',           // [93]
	'',                      // [94]
	'',                      // [95]
	'num0',                  // [96]
	'num1',                  // [97]
	'num2',                  // [98]
	'num3',                  // [99]
	'num4',                  // [100]
	'num5',                  // [101]
	'num6',                  // [102]
	'num7',                  // [103]
	'num8',                  // [104]
	'num9',                  // [105]
	'nummult',               // [106] *
	'numadd',                // [107] +
	'',                      // [108]
	'numsub',                // [109] -
	'numdec',                // [110]
	'numdiv',                // [111] ÷
	'F1',                    // [112]
	'F2',                    // [113]
	'F3',                    // [114]
	'F4',                    // [115]
	'F5',                    // [116]
	'F6',                    // [117]
	'F7',                    // [118]
	'F8',                    // [119]
	'F9',                    // [120]
	'F10',                   // [121]
	'F11',                   // [122]
	'F12',                   // [123]
	'F13',                   // [124]
	'F14',                   // [125]
	'F15',                   // [126]
	'F16',                   // [127]
	'F17',                   // [128]
	'F18',                   // [129]
	'F19',                   // [130]
	'F20',                   // [131]
	'F21',                   // [132]
	'F22',                   // [133]
	'F23',                   // [134]
	'F24',                   // [135]
	'',                      // [136]
	'',                      // [137]
	'',                      // [138]
	'',                      // [139]
	'',                      // [140]
	'',                      // [141]
	'',                      // [142]
	'',                      // [143]
	'Numlock',               // [144]
	'Scrolllock',            // [145]
	'',                      // [146]
	'',                      // [147]
	'',                      // [148]
	'',                      // [149]
	'',                      // [150]
	'',                      // [151]
	'',                      // [152]
	'',                      // [153]
	'',                      // [154]
	'',                      // [155]
	'',                      // [156]
	'',                      // [157]
	'',                      // [158]
	'',                      // [159]
	'',                      // [160]
	'!',                     // [161]
	'"',                     // [162]
	'#',                     // [163]
	'$',                     // [164]
	'%',                     // [165]
	'&',                     // [166]
	'_',                     // [167]
	'(',                     // [168]
	')',                     // [169]
	'*',                     // [170]
	'Plus',                  // [171]
	'|',                     // [172]
	'-',                     // [173]
	'{',                     // [174]
	'}',                     // [175]
	'~',                     // [176]
	'',                      // [177]
	'',                      // [178]
	'',                      // [179]
	'',                      // [180]
	'VolumeMute',            // [181]
	'VolumeDown',            // [182]
	'VolumeUp',              // [183]
	'',                      // [184]
	'',                      // [185]
	';',                     // [186]
	'=',                     // [187]
	',',                     // [188]
	'-',                     // [189]
	'.',                     // [190]
	'/',                     // [191]
	'`',                     // [192]
	'',                      // [193]
	'',                      // [194]
	'',                      // [195]
	'',                      // [196]
	'',                      // [197]
	'',                      // [198]
	'',                      // [199]
	'',                      // [200]
	'',                      // [201]
	'',                      // [202]
	'',                      // [203]
	'',                      // [204]
	'',                      // [205]
	'',                      // [206]
	'',                      // [207]
	'',                      // [208]
	'',                      // [209]
	'',                      // [210]
	'',                      // [211]
	'',                      // [212]
	'',                      // [213]
	'',                      // [214]
	'',                      // [215]
	'',                      // [216]
	'',                      // [217]
	'',                      // [218]
	'[',                     // [219]
	'\\',                    // [220]
	']',                     // [221]
	'\'',                    // [222]
	'',                      // [223]
	'',                      // [224]
	'AltGr',                 // [225]
	'',                      // [226]
	'',                      // [227]
	'',                      // [228]
	'',                      // [229]
	'',                      // [230]
	'',                      // [231]
	'',                      // [232]
	'',                      // [233]
	'',                      // [234]
	'',                      // [235]
	'',                      // [236]
	'',                      // [237]
	'',                      // [238]
	'',                      // [239]
	'',                      // [240]
	'',                      // [241]
	'',                      // [242]
	'',                      // [243]
	'',                      // [244]
	'',                      // [245]
	'',                      // [246]
	'',                      // [247]
	'',                      // [248]
	'',                      // [249]
	'',                      // [250]
	'',                      // [251]
	'',                      // [252]
	'',                      // [253]
	'',                      // [254]
	'',                       // [255]
];

const defaultKeymapItems = {
	darwin: [
		{ accelerator: 'Cmd+N', command: 'newNote' },
		{ accelerator: 'Cmd+T', command: 'newTodo' },
		{ accelerator: 'Cmd+S', command: 'synchronize' },
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
		{ accelerator: 'Option+Cmd+S', command: 'toggleSideBar' },
		{ accelerator: 'Option+Cmd+L', command: 'toggleNoteList' },
		{ accelerator: 'Cmd+L', command: 'toggleVisiblePanes' },
		{ accelerator: 'Cmd+0', command: 'zoomActualSize' },
		{ accelerator: 'Cmd+E', command: 'toggleExternalEditing' },
		{ accelerator: 'Option+Cmd+T', command: 'setTags' },
		{ accelerator: 'Cmd+P', command: 'gotoAnything' },
		{ accelerator: 'Shift+Cmd+P', command: 'commandPalette' },
		{ accelerator: 'F1', command: 'help' },
	],
	default: [
		{ accelerator: 'Ctrl+N', command: 'newNote' },
		{ accelerator: 'Ctrl+T', command: 'newTodo' },
		{ accelerator: 'Ctrl+S', command: 'synchronize' },
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
		{ accelerator: 'F10', command: 'toggleSideBar' },
		{ accelerator: 'F11', command: 'toggleNoteList' },
		{ accelerator: 'Ctrl+L', command: 'toggleVisiblePanes' },
		{ accelerator: 'Ctrl+0', command: 'zoomActualSize' },
		{ accelerator: 'Ctrl+E', command: 'toggleExternalEditing' },
		{ accelerator: 'Ctrl+Alt+T', command: 'setTags' },
		{ accelerator: 'Ctrl+,', command: 'config' },
		{ accelerator: 'Ctrl+P', command: 'gotoAnything' },
		{ accelerator: 'Ctrl+Shift+P', command: 'commandPalette' },
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
	private lastSaveTime_:number;

	public constructor() {
		super();

		this.lastSaveTime_ = Date.now();
	}

	public get lastSaveTime():number {
		return this.lastSaveTime_;
	}

	// `additionalDefaultCommandNames` will be added to the default keymap
	// **except** if they are already in it. Basically this is a mechanism
	// to add all the commands from the command service to the default
	// keymap.
	public initialize(additionalDefaultCommandNames:string[] = [], platform: string = shim.platformName()) {
		this.platform = platform;

		switch (platform) {
		case 'darwin':
			this.defaultKeymapItems = defaultKeymapItems.darwin.slice();
			this.modifiersRegExp = modifiersRegExp.darwin;
			break;
		default:
			this.defaultKeymapItems = defaultKeymapItems.default.slice();
			this.modifiersRegExp = modifiersRegExp.default;
		}

		for (const name of additionalDefaultCommandNames) {
			if (this.defaultKeymapItems.find((item:KeymapItem) => item.command === name)) continue;
			this.defaultKeymapItems.push({
				command: name,
				accelerator: null,
			});
		}

		this.resetKeymap();
	}

	// Reset keymap back to its default values
	public resetKeymap() {
		this.keymap = {};
		for (let i = 0; i < this.defaultKeymapItems.length; i++) {
			// Keep the original defaultKeymapItems array untouched
			// Makes it possible to retrieve the original accelerator later, if needed
			this.keymap[this.defaultKeymapItems[i].command] = { ...this.defaultKeymapItems[i] };
		}
	}

	public async loadCustomKeymap(customKeymapPath: string) {
		this.customKeymapPath = customKeymapPath; // Useful for saving the changes later

		if (await shim.fsDriver().exists(customKeymapPath)) {
			this.logger().info(`KeymapService: Loading keymap from file: ${customKeymapPath}`);

			const customKeymapFile = (await shim.fsDriver().readFile(customKeymapPath, 'utf-8')).trim();
			if (!customKeymapFile) return;

			// Custom keymaps are supposed to contain an array of keymap items
			this.overrideKeymap(JSON.parse(customKeymapFile));
		}
	}

	public async saveCustomKeymap(customKeymapPath: string = this.customKeymapPath) {
		this.logger().info(`KeymapService: Saving keymap to file: ${customKeymapPath}`);

		try {
			// Only the customized keymap items should be saved to the disk
			const customKeymapItems = this.getCustomKeymapItems();
			await shim.fsDriver().writeFile(customKeymapPath, JSON.stringify(customKeymapItems, null, 2), 'utf-8');

			this.lastSaveTime_ = Date.now();

			// Refresh the menu items so that the changes are reflected
			eventManager.emit('keymapChange');
		} catch (err) {
			const message = err.message || '';
			throw new Error(_('Error: %s', message));
		}
	}

	public acceleratorExists(command: string) {
		return !!this.keymap[command];
	}

	private convertToPlatform(accelerator:string) {
		return accelerator
			.replace(/CmdOrCtrl/g, this.platform === 'darwin' ? 'Cmd' : 'Ctrl')
			.replace(/Option/g, this.platform === 'darwin' ? 'Option' : 'Alt')
			.replace(/Alt/g, this.platform === 'darwin' ? 'Option' : 'Alt');
	}

	public registerCommandAccelerator(commandName:string, accelerator:string) {
		// If the command is already registered, we don't register it again and
		// we don't update the accelerator. This is because it might have been
		// modified by the user and we don't want the plugin to overwrite this.
		if (this.keymap[commandName]) return;

		if (!commandName) throw new Error('Cannot register an accelerator without a command name');

		const validatedAccelerator = accelerator ? this.convertToPlatform(accelerator) : null;
		if (validatedAccelerator) this.validateAccelerator(validatedAccelerator);

		this.keymap[commandName] = {
			command: commandName,
			accelerator: validatedAccelerator,
		};
	}

	public setAccelerator(command: string, accelerator: string) {
		this.keymap[command].accelerator = accelerator;
	}

	public getAccelerator(command: string) {
		const item = this.keymap[command];
		if (!item) throw new Error(`KeymapService: "${command}" command does not exist!`);

		return item.accelerator;
	}

	public getDefaultAccelerator(command: string) {
		const defaultItem = this.defaultKeymapItems.find((item => item.command === command));
		if (!defaultItem) throw new Error(`KeymapService: "${command}" command does not exist!`);

		return defaultItem.accelerator;
	}

	public getCommandNames() {
		return Object.keys(this.keymap);
	}

	public getKeymapItems() {
		return Object.values(this.keymap);
	}

	public getCustomKeymapItems() {
		const customkeymapItems: KeymapItem[] = [];
		this.defaultKeymapItems.forEach(({ command, accelerator }) => {
			const currentAccelerator = this.getAccelerator(command);

			// Only the customized/changed keymap items are neccessary for the custom keymap
			// Customizations can be merged with the original keymap at the runtime
			if (this.getAccelerator(command) !== accelerator) {
				customkeymapItems.push({ command, accelerator: currentAccelerator });
			}
		});

		for (const commandName in this.keymap) {
			if (!this.defaultKeymapItems.find((item:KeymapItem) => item.command === commandName)) {
				customkeymapItems.push(this.keymap[commandName]);
			}
		}

		return customkeymapItems;
	}

	public getDefaultKeymapItems() {
		return [...this.defaultKeymapItems];
	}

	public overrideKeymap(customKeymapItems: KeymapItem[]) {
		try {
			for (let i = 0; i < customKeymapItems.length; i++) {
				const item = customKeymapItems[i];
				// Validate individual custom keymap items
				// Throws if there are any issues in the keymap item
				this.validateKeymapItem(item);

				// If the command does not exist in the keymap, we are loading a new
				// command accelerator so we need to register it.
				if (!this.keymap[item.command]) {
					this.registerCommandAccelerator(item.command, item.accelerator);
				} else {
					this.setAccelerator(item.command, item.accelerator);
				}
			}

			// Validate the entire keymap for duplicates
			// Throws whenever there are duplicate Accelerators used in the keymap
			this.validateKeymap();
		} catch (err) {
			this.resetKeymap(); // Discard all the changes if there are any issues
			throw err;
		}
	}

	private validateKeymapItem(item: KeymapItem) {
		if (!item.hasOwnProperty('command')) {
			throw new Error(_('"%s" is missing the required "%s" property.', JSON.stringify(item), _('command')));
		// } else if (!this.keymap.hasOwnProperty(item.command)) {
		// 	throw new Error(_('Invalid %s: %s.', _('command'), item.command));
		}

		if (!item.hasOwnProperty('accelerator')) {
			throw new Error(_('"%s" is missing the required "%s" property.', JSON.stringify(item), _('accelerator')));
		} else if (item.accelerator !== null) {
			try {
				this.validateAccelerator(item.accelerator);
			} catch {
				throw new Error(_('Invalid %s: %s.', _('accelerator'), item.command));
			}
		}
	}

	public validateKeymap(proposedKeymapItem: KeymapItem = null) {
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

	public validateAccelerator(accelerator: string) {
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

	public domToElectronAccelerator(event:any) {
		const parts = [];

		// We use the "keyCode" and not "key" because the modifier keys
		// would change the "key" value. eg "Option+U" would give "º" as a key instead of "U"
		const { keyCode, ctrlKey, metaKey, altKey, shiftKey } = event;

		// First, the modifiers
		// We have to use the following js events, because modifiers won't stick otherwise
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
		// String.fromCharCode expects unicode charcodes as an argument; e.keyCode returns javascript keycodes.
		// Javascript keycodes and unicode charcodes are not the same thing!
		const electronKey = keycodeToElectronMap[keyCode];
		if (electronKey && keysRegExp.test(electronKey)) parts.push(electronKey);

		return parts.join('+');
	}

	public on(eventName: string, callback: Function) {
		eventManager.on(eventName, callback);
	}

	public off(eventName: string, callback: Function) {
		eventManager.off(eventName, callback);
	}

	private static instance_:KeymapService = null;

	public static destroyInstance() {
		this.instance_ = null;
	}

	public static instance():KeymapService {
		if (this.instance_) return this.instance_;

		this.instance_ = new KeymapService();
		return this.instance_;
	}
}
