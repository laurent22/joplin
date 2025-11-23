"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventManager_1 = require("../eventManager");
const shim_1 = require("../shim");
const locale_1 = require("../locale");
const KeymapService_keysRegExp_1 = require("./KeymapService_keysRegExp");
const KeymapService_keycodeToElectronMap_1 = require("./KeymapService_keycodeToElectronMap");
const BaseService_1 = require("./BaseService");
const modifiersRegExp = {
    darwin: /^(Ctrl|Option|Shift|Cmd)$/,
    default: /^(Ctrl|Alt|AltGr|Shift|Super)$/,
};
const defaultKeymapItems = {
    darwin: [
        { accelerator: 'Cmd+N', command: 'newNote' },
        { accelerator: 'Cmd+T', command: 'newTodo' },
        { accelerator: 'Cmd+S', command: 'synchronize' },
        { accelerator: 'Cmd+H', command: 'hideApp' },
        { accelerator: 'Cmd+Q', command: 'quit' },
        { accelerator: 'Cmd+,', command: 'config' },
        { accelerator: 'Cmd+W', command: 'closeWindow' },
        { accelerator: 'Cmd+M', command: 'minimizeWindow' },
        { accelerator: 'Cmd+C', command: 'textCopy' },
        { accelerator: 'Cmd+X', command: 'textCut' },
        { accelerator: 'Cmd+V', command: 'textPaste' },
        { accelerator: 'Cmd+Shift+V', command: 'pasteAsText' },
        { accelerator: 'Cmd+A', command: 'textSelectAll' },
        { accelerator: 'Cmd+B', command: 'textBold' },
        { accelerator: 'Cmd+I', command: 'textItalic' },
        { accelerator: 'Cmd+K', command: 'textLink' },
        { accelerator: 'Cmd+`', command: 'textCode' },
        { accelerator: 'Option+Cmd+-', command: 'textBulletedList' },
        { accelerator: 'Shift+Cmd+T', command: 'insertDateTime' },
        { accelerator: 'Shift+Cmd+F', command: 'focusSearch' },
        { accelerator: 'Cmd+F', command: 'showLocalSearch' },
        { accelerator: 'Shift+Cmd+S', command: 'focusElementSideBar' },
        { accelerator: 'Shift+Cmd+L', command: 'focusElementNoteList' },
        { accelerator: 'Shift+Cmd+N', command: 'focusElementNoteTitle' },
        { accelerator: 'Shift+Cmd+B', command: 'focusElementNoteBody' },
        { accelerator: 'Shift+Cmd+O', command: 'focusElementToolbar' },
        { accelerator: 'Option+Cmd+S', command: 'toggleSideBar' },
        { accelerator: 'Option+Cmd+L', command: 'toggleNoteList' },
        { accelerator: 'Cmd+L', command: 'toggleVisiblePanes' },
        { accelerator: 'Option+Cmd+V', command: 'toggleEditorPlugin' },
        { accelerator: 'Option+Cmd+E', command: 'toggleEditors' },
        { accelerator: 'Cmd+0', command: 'zoomActualSize' },
        { accelerator: 'Cmd+E', command: 'toggleExternalEditing' },
        { accelerator: 'Option+Cmd+T', command: 'setTags' },
        { accelerator: 'Cmd+P', command: 'gotoAnything' },
        { accelerator: 'Shift+Cmd+P', command: 'commandPalette' },
        { accelerator: 'F1', command: 'help' },
        { accelerator: 'Cmd+D', command: 'editor.deleteLine' },
        { accelerator: 'Shift+Cmd+D', command: 'editor.duplicateLine' },
        { accelerator: 'Cmd+Z', command: 'editor.undo' },
        { accelerator: 'Cmd+Y', command: 'editor.redo' },
        { accelerator: 'Cmd+[', command: 'editor.indentLess' },
        { accelerator: 'Cmd+]', command: 'editor.indentMore' },
        { accelerator: 'Cmd+/', command: 'editor.toggleComment' },
        { accelerator: 'Option+Cmd+A', command: 'editor.sortSelectedLines' },
        { accelerator: 'Option+Up', command: 'editor.swapLineUp' },
        { accelerator: 'Option+Down', command: 'editor.swapLineDown' },
        { accelerator: 'Option+Cmd+1', command: 'switchProfile1' },
        { accelerator: 'Option+Cmd+2', command: 'switchProfile2' },
        { accelerator: 'Option+Cmd+3', command: 'switchProfile3' },
        { accelerator: 'Option+Cmd+Backspace', command: 'permanentlyDeleteNote' },
        { accelerator: 'Option+Cmd+N', command: 'openNoteInNewWindow' },
        { accelerator: 'Ctrl+M', command: 'toggleTabMovesFocus' },
        { accelerator: 'Shift+Option+L', command: 'linkToNote' },
    ],
    default: [
        { accelerator: 'Ctrl+N', command: 'newNote' },
        { accelerator: 'Ctrl+T', command: 'newTodo' },
        { accelerator: 'Ctrl+S', command: 'synchronize' },
        { accelerator: 'Ctrl+Q', command: 'quit' },
        { accelerator: 'Ctrl+C', command: 'textCopy' },
        { accelerator: 'Ctrl+X', command: 'textCut' },
        { accelerator: 'Ctrl+V', command: 'textPaste' },
        { accelerator: 'Ctrl+Shift+V', command: 'pasteAsText' },
        { accelerator: 'Ctrl+A', command: 'textSelectAll' },
        { accelerator: 'Ctrl+B', command: 'textBold' },
        { accelerator: 'Ctrl+I', command: 'textItalic' },
        { accelerator: 'Ctrl+K', command: 'textLink' },
        { accelerator: 'Ctrl+`', command: 'textCode' },
        { accelerator: 'Ctrl+Alt+-', command: 'textBulletedList' },
        { accelerator: 'Ctrl+Shift+T', command: 'insertDateTime' },
        { accelerator: 'F6', command: 'focusSearch' },
        { accelerator: 'Ctrl+F', command: 'showLocalSearch' },
        { accelerator: 'Ctrl+Shift+S', command: 'focusElementSideBar' },
        { accelerator: 'Ctrl+Shift+L', command: 'focusElementNoteList' },
        { accelerator: 'Ctrl+Shift+N', command: 'focusElementNoteTitle' },
        { accelerator: 'Ctrl+Shift+B', command: 'focusElementNoteBody' },
        { accelerator: 'Ctrl+Shift+O', command: 'focusElementToolbar' },
        { accelerator: 'F10', command: 'toggleSideBar' },
        { accelerator: 'Ctrl+Shift+M', command: 'toggleMenuBar' },
        { accelerator: 'F11', command: 'toggleNoteList' },
        { accelerator: 'Ctrl+L', command: 'toggleVisiblePanes' },
        { accelerator: 'Alt+Ctrl+V', command: 'toggleEditorPlugin' },
        { accelerator: 'Alt+Ctrl+E', command: 'toggleEditors' },
        { accelerator: 'Ctrl+0', command: 'zoomActualSize' },
        { accelerator: 'Ctrl+E', command: 'toggleExternalEditing' },
        { accelerator: 'Ctrl+Alt+T', command: 'setTags' },
        { accelerator: 'Ctrl+,', command: 'config' },
        { accelerator: 'Ctrl+P', command: 'gotoAnything' },
        { accelerator: 'Ctrl+Shift+P', command: 'commandPalette' },
        { accelerator: 'F1', command: 'help' },
        { accelerator: 'Ctrl+D', command: 'editor.deleteLine' },
        { accelerator: 'Shift+Ctrl+D', command: 'editor.duplicateLine' },
        { accelerator: 'Ctrl+Z', command: 'editor.undo' },
        { accelerator: 'Ctrl+Y', command: 'editor.redo' },
        { accelerator: 'Ctrl+[', command: 'editor.indentLess' },
        { accelerator: 'Ctrl+]', command: 'editor.indentMore' },
        { accelerator: 'Ctrl+/', command: 'editor.toggleComment' },
        { accelerator: 'Ctrl+Alt+S', command: 'editor.sortSelectedLines' },
        { accelerator: 'Alt+Up', command: 'editor.swapLineUp' },
        { accelerator: 'Alt+Down', command: 'editor.swapLineDown' },
        { accelerator: 'Ctrl+Alt+1', command: 'switchProfile1' },
        { accelerator: 'Ctrl+Alt+2', command: 'switchProfile2' },
        { accelerator: 'Ctrl+Alt+3', command: 'switchProfile3' },
        { accelerator: 'Ctrl+Alt+N', command: 'openNoteInNewWindow' },
        { accelerator: 'Ctrl+M', command: 'toggleTabMovesFocus' },
        { accelerator: 'Shift+Alt+L', command: 'linkToNote' },
    ],
};
class KeymapService extends BaseService_1.default {
    constructor() {
        super();
        this.lastSaveTime_ = Date.now();
    }
    get lastSaveTime() {
        return this.lastSaveTime_;
    }
    // `additionalDefaultCommandNames` will be added to the default keymap
    // **except** if they are already in it. Basically this is a mechanism
    // to add all the commands from the command service to the default
    // keymap.
    initialize(additionalDefaultCommandNames = [], platform = shim_1.default.platformName()) {
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
            if (this.defaultKeymapItems.find((item) => item.command === name))
                continue;
            this.defaultKeymapItems.push({
                command: name,
                accelerator: null,
            });
        }
        this.resetKeymap();
    }
    // Reset keymap back to its default values
    resetKeymap() {
        this.keymap = {};
        for (let i = 0; i < this.defaultKeymapItems.length; i++) {
            // Keep the original defaultKeymapItems array untouched
            // Makes it possible to retrieve the original accelerator later, if needed
            this.keymap[this.defaultKeymapItems[i].command] = Object.assign({}, this.defaultKeymapItems[i]);
        }
    }
    async loadCustomKeymap(customKeymapPath) {
        this.customKeymapPath = customKeymapPath; // Useful for saving the changes later
        if (await shim_1.default.fsDriver().exists(customKeymapPath)) {
            this.logger().info(`KeymapService: Loading keymap from file: ${customKeymapPath}`);
            const customKeymapFile = (await shim_1.default.fsDriver().readFile(customKeymapPath, 'utf-8')).trim();
            if (!customKeymapFile)
                return;
            // Custom keymaps are supposed to contain an array of keymap items
            this.overrideKeymap(JSON.parse(customKeymapFile));
        }
    }
    async saveCustomKeymap(customKeymapPath = this.customKeymapPath) {
        this.logger().info(`KeymapService: Saving keymap to file: ${customKeymapPath}`);
        try {
            // Only the customized keymap items should be saved to the disk
            const customKeymapItems = this.getCustomKeymapItems();
            await shim_1.default.fsDriver().writeFile(customKeymapPath, JSON.stringify(customKeymapItems, null, 2), 'utf-8');
            this.lastSaveTime_ = Date.now();
            // Refresh the menu items so that the changes are reflected
            eventManager_1.default.emit(eventManager_1.EventName.KeymapChange);
        }
        catch (error) {
            const message = error.message || '';
            throw new Error((0, locale_1._)('Error: %s', message));
        }
    }
    acceleratorExists(command) {
        return !!this.keymap[command];
    }
    convertToPlatform(accelerator) {
        return accelerator
            .replace(/CmdOrCtrl/g, this.platform === 'darwin' ? 'Cmd' : 'Ctrl')
            .replace(/Option/g, this.platform === 'darwin' ? 'Option' : 'Alt')
            .replace(/Alt/g, this.platform === 'darwin' ? 'Option' : 'Alt');
    }
    registerCommandAccelerator(commandName, accelerator) {
        // If the command is already registered, we don't register it again and
        // we don't update the accelerator. This is because it might have been
        // modified by the user and we don't want the plugin to overwrite this.
        if (this.keymap[commandName])
            return;
        if (!commandName)
            throw new Error('Cannot register an accelerator without a command name');
        const validatedAccelerator = accelerator ? this.convertToPlatform(accelerator) : null;
        if (validatedAccelerator)
            this.validateAccelerator(validatedAccelerator);
        this.keymap[commandName] = {
            command: commandName,
            accelerator: validatedAccelerator,
        };
    }
    setAccelerator(command, accelerator) {
        this.keymap[command].accelerator = accelerator;
    }
    getAccelerator(command) {
        const item = this.keymap[command];
        if (!item)
            throw new Error(`KeymapService: "${command}" command does not exist!`);
        return item.accelerator;
    }
    getDefaultAccelerator(command) {
        const defaultItem = this.defaultKeymapItems.find((item => item.command === command));
        if (!defaultItem)
            throw new Error(`KeymapService: "${command}" command does not exist!`);
        return defaultItem.accelerator;
    }
    getCommandNames() {
        return Object.keys(this.keymap);
    }
    getKeymapItems() {
        return Object.values(this.keymap);
    }
    getCustomKeymapItems() {
        const customkeymapItems = [];
        // eslint-disable-next-line github/array-foreach -- Old code before rule was applied
        this.defaultKeymapItems.forEach(({ command, accelerator }) => {
            const currentAccelerator = this.getAccelerator(command);
            // Only the customized/changed keymap items are necessary for the custom keymap
            // Customizations can be merged with the original keymap at the runtime
            if (this.getAccelerator(command) !== accelerator) {
                customkeymapItems.push({ command, accelerator: currentAccelerator });
            }
        });
        for (const commandName in this.keymap) {
            if (!this.defaultKeymapItems.find((item) => item.command === commandName)) {
                customkeymapItems.push(this.keymap[commandName]);
            }
        }
        return customkeymapItems;
    }
    getDefaultKeymapItems() {
        return [...this.defaultKeymapItems];
    }
    overrideKeymap(customKeymapItems) {
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
                }
                else {
                    this.setAccelerator(item.command, item.accelerator);
                }
            }
            // Validate the entire keymap for duplicates
            // Throws whenever there are duplicate Accelerators used in the keymap
            this.validateKeymap();
        }
        catch (error) {
            this.resetKeymap(); // Discard all the changes if there are any issues
            throw error;
        }
    }
    validateKeymapItem(item) {
        if (!item.hasOwnProperty('command')) {
            throw new Error((0, locale_1._)('"%s" is missing the required "%s" property.', JSON.stringify(item), (0, locale_1._)('command')));
            // } else if (!this.keymap.hasOwnProperty(item.command)) {
            // 	throw new Error(_('Invalid %s: %s.', _('command'), item.command));
        }
        if (!item.hasOwnProperty('accelerator')) {
            throw new Error((0, locale_1._)('"%s" is missing the required "%s" property.', JSON.stringify(item), (0, locale_1._)('accelerator')));
        }
        else if (item.accelerator !== null) {
            try {
                this.validateAccelerator(item.accelerator);
            }
            catch (_a) {
                throw new Error((0, locale_1._)('Invalid %s: %s.', (0, locale_1._)('accelerator'), item.command));
            }
        }
    }
    validateKeymap(proposedKeymapItem = null) {
        const usedAccelerators = new Set();
        // Validate as if the proposed change is already present in the current keymap
        // Helpful for detecting any errors that'll occur, when the proposed change is performed on the keymap
        if (proposedKeymapItem)
            usedAccelerators.add(proposedKeymapItem.accelerator);
        for (const item of Object.values(this.keymap)) {
            const [itemAccelerator, itemCommand] = [item.accelerator, item.command];
            if (proposedKeymapItem && itemCommand === proposedKeymapItem.command)
                continue; // Ignore the original accelerator
            if (usedAccelerators.has(itemAccelerator)) {
                const originalItem = (proposedKeymapItem && proposedKeymapItem.accelerator === itemAccelerator)
                    ? proposedKeymapItem
                    : Object.values(this.keymap).find(_item => _item.accelerator === itemAccelerator);
                throw new Error((0, locale_1._)('Accelerator "%s" is used for "%s" and "%s" commands. This may lead to unexpected behaviour.', itemAccelerator, originalItem.command, itemCommand));
            }
            else if (itemAccelerator) {
                usedAccelerators.add(itemAccelerator);
            }
        }
    }
    validateAccelerator(accelerator) {
        let keyFound = false;
        const parts = accelerator.split('+');
        const isValid = parts.every((part, index) => {
            const isKey = KeymapService_keysRegExp_1.default.test(part);
            const isModifier = this.modifiersRegExp.test(part);
            if (isKey) {
                // Key must be unique
                if (keyFound)
                    return false;
                keyFound = true;
            }
            // Key is required
            if (index === (parts.length - 1) && !keyFound)
                return false;
            return isKey || isModifier;
        });
        if (!isValid)
            throw new Error((0, locale_1._)('Accelerator "%s" is not valid.', accelerator));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    domToElectronAccelerator(event) {
        const parts = [];
        // We use the "keyCode" and not "key" because the modifier keys
        // would change the "key" value. eg "Option+U" would give "º" as a key instead of "U"
        const { keyCode, ctrlKey, metaKey, altKey, shiftKey } = event;
        // First, the modifiers
        // We have to use the following js events, because modifiers won't stick otherwise
        if (ctrlKey)
            parts.push('Ctrl');
        switch (this.platform) {
            case 'darwin':
                if (altKey)
                    parts.push('Option');
                if (shiftKey)
                    parts.push('Shift');
                if (metaKey)
                    parts.push('Cmd');
                break;
            default:
                if (altKey)
                    parts.push('Alt');
                if (shiftKey)
                    parts.push('Shift');
        }
        // Finally, the key
        // String.fromCharCode expects unicode charcodes as an argument; e.keyCode returns javascript keycodes.
        // Javascript keycodes and unicode charcodes are not the same thing!
        const electronKey = KeymapService_keycodeToElectronMap_1.default[keyCode];
        if (electronKey && KeymapService_keysRegExp_1.default.test(electronKey))
            parts.push(electronKey);
        return parts.join('+');
    }
    // Electron and aria-keyshortcuts have slightly different formats for accelerators.
    // See https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-keyshortcuts
    getAriaKeyShortcuts(commandName) {
        const electronAccelerator = this.getAccelerator(commandName);
        return electronAccelerator === null || electronAccelerator === void 0 ? void 0 : electronAccelerator.replace('Ctrl', 'Control');
    }
    on(eventName, callback) {
        eventManager_1.default.on(eventName, callback);
    }
    off(eventName, callback) {
        eventManager_1.default.off(eventName, callback);
    }
    static destroyInstance() {
        this.instance_ = null;
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new KeymapService();
        return this.instance_;
    }
}
KeymapService.instance_ = null;
exports.default = KeymapService;
