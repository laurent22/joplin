import ElectronAppWrapper from './ElectronAppWrapper';
import shim from '@joplin/lib/shim';
import { _, setLocale } from '@joplin/lib/locale';
import { BrowserWindow, nativeTheme, nativeImage } from 'electron';
const { dirname, toSystemSlashes } = require('@joplin/lib/path-utils');

interface LastSelectedPath {
	file: string;
	directory: string;
}

interface OpenDialogOptions {
	properties?: string[];
	defaultPath?: string;
	createDirectory?: boolean;
	filters?: any[];
}

export class Bridge {

	private electronWrapper_: ElectronAppWrapper;
	private lastSelectedPaths_: LastSelectedPath;

	public constructor(electronWrapper: ElectronAppWrapper) {
		this.electronWrapper_ = electronWrapper;
		this.lastSelectedPaths_ = {
			file: null,
			directory: null,
		};
	}

	public electronApp() {
		return this.electronWrapper_;
	}

	public electronIsDev() {
		return !this.electronApp().electronApp().isPackaged;
	}

	// The build directory contains additional external files that are going to
	// be packaged by Electron Builder. This is for files that need to be
	// accessed outside of the Electron app (for example the application icon).
	//
	// Any static file that's accessed from within the app such as CSS or fonts
	// should go in /vendor.
	//
	// The build folder location is dynamic, depending on whether we're running
	// in dev or prod, which makes it hard to access it from static files (for
	// example from plain HTML files that load CSS or JS files). For this reason
	// it should be avoided as much as possible.
	public buildDir() {
		return this.electronApp().buildDir();
	}

	// The vendor directory and its content is dynamically created from other
	// dir (usually by pulling files from node_modules). It can also be accessed
	// using a relative path such as "../../vendor/lib/file.js" because it will
	// be at the same location in both prod and dev mode (unlike the build dir).
	public vendorDir() {
		return `${__dirname}/vendor`;
	}

	public env() {
		return this.electronWrapper_.env();
	}

	public processArgv() {
		return process.argv;
	}

	// Applies to electron-context-menu@3:
	//
	// For now we have to disable spell checking in non-editor text
	// areas (such as the note title) because the context menu lives in
	// the main process, and the spell checker service is in the
	// renderer process. To get the word suggestions, we need to call
	// the spellchecker service but that can only be done in an async
	// way, and the menu is built synchronously.
	//
	// Moving the spellchecker to the main process would be hard because
	// it depends on models and various other classes which are all in
	// the renderer process.
	//
	// Perhaps the easiest would be to patch electron-context-menu to
	// support the renderer process again. Or possibly revert to an old
	// version of electron-context-menu.
	public setupContextMenu(_spellCheckerMenuItemsHandler: Function) {
		require('electron-context-menu')({
			allWindows: [this.window()],

			electronApp: this.electronApp(),

			shouldShowMenu: (_event: any, params: any) => {
				// params.inputFieldType === 'none' when right-clicking the text
				// editor. This is a bit of a hack to detect it because in this
				// case we don't want to use the built-in context menu but a
				// custom one.
				return params.isEditable && params.inputFieldType !== 'none';
			},

			// menu: (actions: any, props: any) => {
			// 	const items = spellCheckerMenuItemsHandler(props.misspelledWord, props.dictionarySuggestions);
			// 	const spellCheckerMenuItems = items.map((item: any) => new MenuItem(item)); //SpellCheckerService.instance().contextMenuItems(props.misspelledWord, props.dictionarySuggestions).map((item: any) => new MenuItem(item));

			// 	const output = [
			// 		actions.cut(),
			// 		actions.copy(),
			// 		actions.paste(),
			// 		...spellCheckerMenuItems,
			// 	];

			// 	return output;
			// },
		});
	}

	public window() {
		return this.electronWrapper_.window();
	}

	public showItemInFolder(fullPath: string) {
		return require('electron').shell.showItemInFolder(toSystemSlashes(fullPath));
	}

	public newBrowserWindow(options: any) {
		return new BrowserWindow(options);
	}

	public windowContentSize() {
		if (!this.window()) return { width: 0, height: 0 };
		const s = this.window().getContentSize();
		return { width: s[0], height: s[1] };
	}

	public windowSize() {
		if (!this.window()) return { width: 0, height: 0 };
		const s = this.window().getSize();
		return { width: s[0], height: s[1] };
	}

	public windowSetSize(width: number, height: number) {
		if (!this.window()) return;
		return this.window().setSize(width, height);
	}

	public openDevTools() {
		return this.window().webContents.openDevTools();
	}

	public closeDevTools() {
		return this.window().webContents.closeDevTools();
	}

	public async showSaveDialog(options: any) {
		const { dialog } = require('electron');
		if (!options) options = {};
		if (!('defaultPath' in options) && this.lastSelectedPaths_.file) options.defaultPath = this.lastSelectedPaths_.file;
		const { filePath } = await dialog.showSaveDialog(this.window(), options);
		if (filePath) {
			this.lastSelectedPaths_.file = filePath;
		}
		return filePath;
	}

	public async showOpenDialog(options: OpenDialogOptions = null) {
		const { dialog } = require('electron');
		if (!options) options = {};
		let fileType = 'file';
		if (options.properties && options.properties.includes('openDirectory')) fileType = 'directory';
		if (!('defaultPath' in options) && (this.lastSelectedPaths_ as any)[fileType]) options.defaultPath = (this.lastSelectedPaths_ as any)[fileType];
		if (!('createDirectory' in options)) options.createDirectory = true;
		const { filePaths } = await dialog.showOpenDialog(this.window(), options as any);
		if (filePaths && filePaths.length) {
			(this.lastSelectedPaths_ as any)[fileType] = dirname(filePaths[0]);
		}
		return filePaths;
	}

	// Don't use this directly - call one of the showXxxxxxxMessageBox() instead
	private showMessageBox_(window: any, options: any): number {
		const { dialog } = require('electron');
		if (!window) window = this.window();
		return dialog.showMessageBoxSync(window, options);
	}

	public showErrorMessageBox(message: string) {
		return this.showMessageBox_(this.window(), {
			type: 'error',
			message: message,
			buttons: [_('OK')],
		});
	}

	public showConfirmMessageBox(message: string, options: any = null) {
		options = {
			buttons: [_('OK'), _('Cancel')],
			...options,
		};

		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'question',
			message: message,
			cancelId: 1,
			buttons: options.buttons,
		}, options));

		return result === 0;
	}

	/* returns the index of the clicked button */
	public showMessageBox(message: string, options: any = null) {
		if (options === null) options = {};

		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'question',
			message: message,
			buttons: [_('OK'), _('Cancel')],
		}, options));

		return result;
	}

	public showInfoMessageBox(message: string, options: any = {}) {
		const result = this.showMessageBox_(this.window(), Object.assign({}, {
			type: 'info',
			message: message,
			buttons: [_('OK')],
		}, options));
		return result === 0;
	}

	public setLocale(locale: string) {
		setLocale(locale);
	}

	public get Menu() {
		return require('electron').Menu;
	}

	public get MenuItem() {
		return require('electron').MenuItem;
	}

	public openExternal(url: string) {
		return require('electron').shell.openExternal(url);
	}

	public async openItem(fullPath: string) {
		return require('electron').shell.openPath(toSystemSlashes(fullPath));
	}

	public screen() {
		return require('electron').screen;
	}

	public shouldUseDarkColors() {
		return nativeTheme.shouldUseDarkColors;
	}

	public addEventListener(name: string, fn: Function) {
		if (name === 'nativeThemeUpdated') {
			nativeTheme.on('updated', fn);
		} else {
			throw new Error(`Unsupported event: ${name}`);
		}
	}

	public restart(linuxSafeRestart = true) {
		// Note that in this case we are not sending the "appClose" event
		// to notify services and component that the app is about to close
		// but for the current use-case it's not really needed.
		const { app } = require('electron');

		if (shim.isPortable()) {
			const options = {
				execPath: process.env.PORTABLE_EXECUTABLE_FILE,
			};
			app.relaunch(options);
		} else if (shim.isLinux() && linuxSafeRestart) {
			this.showInfoMessageBox(_('The app is now going to close. Please relaunch it to complete the process.'));
		} else {
			app.relaunch();
		}

		app.exit();
	}

	public createImageFromPath(path: string) {
		return nativeImage.createFromPath(path);
	}

}

let bridge_: Bridge = null;

export function initBridge(wrapper: ElectronAppWrapper) {
	if (bridge_) throw new Error('Bridge already initialized');
	bridge_ = new Bridge(wrapper);
	return bridge_;
}

export default function bridge() {
	if (!bridge_) throw new Error('Bridge not initialized');
	return bridge_;
}
