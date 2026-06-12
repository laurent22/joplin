/* eslint-disable @typescript-eslint/no-explicit-any */
// This is a fork of electron-context-menu@0.15.0. We need to fork it because
// the latest version only runs from the main process and we need it in the
// renderer process. It also has a dependency to electron-is-dev which also only
// runs in the main process.
//
// In fact we almost don't use any features of electron-context-menu, which is
// just a wrapper over Electron's own native context menu but with more bugs, so
// we should get rid of it, but for now this is good enough as a quick fix.

import * as electron from 'electron';
import { focus } from '@joplin/lib/utils/focusHandler';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Require lazy loading because requiring it in the main process crashes
let electronRemote: any = null;
const getElectronRemote = () => {
	if (electronRemote !== null) return electronRemote;
	try {
		if (process.type === 'renderer') {
			electronRemote = require('@electron/remote');
		} else {
			electronRemote = false;
		}
	} catch (e) {
		electronRemote = false;
	}
	return electronRemote;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- win can be a BrowserWindow or WebviewTag, which share webContents
const getWebContents = (win: any): electron.WebContents => win.webContents || (win.getWebContents && win.getWebContents());

interface ContextMenuItem extends electron.MenuItemConstructorOptions {
	transform?: (text: string)=> string;
}

interface DecoratorOptions {
	transform?: (text: string)=> string;
	click?: (menuItem: electron.MenuItem, browserWindow: electron.BrowserWindow | undefined, event: electron.KeyboardEvent)=> void;
}

const decorateMenuItem = (menuItem: ContextMenuItem) => {
	return (options: DecoratorOptions = {}) => {
		if (options.transform && !options.click) {
			menuItem.transform = options.transform;
		}

		return menuItem;
	};
};

const removeUnusedMenuItems = (menuTemplate: (ContextMenuItem | undefined | false)[]) => {
	let notDeletedPreviousElement: ContextMenuItem | undefined;

	return menuTemplate
		.filter((menuItem): menuItem is ContextMenuItem => menuItem !== undefined && menuItem !== false && menuItem.visible !== false)
		.filter((menuItem, index, array) => {
			const toDelete = menuItem.type === 'separator' && (!notDeletedPreviousElement || index === array.length - 1 || array[index + 1].type === 'separator');
			notDeletedPreviousElement = toDelete ? notDeletedPreviousElement : menuItem;
			return !toDelete;
		});
};

interface ContextMenuOptions {
	window?: any;
	shouldShowMenu?: (event: any, props: any)=> boolean;
	showInspectElement?: boolean;
	showLookUpSelection?: boolean;
	showSaveImageAs?: boolean;
	showCopyImage?: boolean;
	showCopyImageAddress?: boolean;
	showServices?: boolean;
	allWindows?: any;
	electronApp?: any;
	labels?: Record<string, string>;
	menu?: (defaultActions: any, props: electron.ContextMenuParams, win: any)=> (ContextMenuItem | undefined | false)[];
	prepend?: (defaultActions: any, props: electron.ContextMenuParams, win: any)=> (ContextMenuItem | undefined | false)[];
	append?: (defaultActions: any, props: electron.ContextMenuParams, win: any)=> (ContextMenuItem | undefined | false)[];
}

const create = (win: any, options: ContextMenuOptions) => {
	getWebContents(win).on('context-menu', (event: electron.Event, props: electron.ContextMenuParams) => {
		if (typeof options.shouldShowMenu === 'function' && options.shouldShowMenu(event, props) === false) {
			return;
		}

		// If another listener has called .preventDefault, don't show the default context menu.
		if (event.defaultPrevented) {
			return;
		}

		const { editFlags } = props;
		const hasText = props.selectionText.trim().length > 0;
		const isLink = Boolean(props.linkURL);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- editFlags is indexed dynamically
		const can = (type: string) => (editFlags as any)[`can${type}`] && hasText;

		const defaultActions = {
			separator: () => ({ type: 'separator' as const }),
			lookUpSelection: decorateMenuItem({
				id: 'lookUpSelection',
				label: 'Look Up “{selection}”',
				visible: process.platform === 'darwin' && hasText && !isLink,
				click() {
					if (process.platform === 'darwin') {
						getWebContents(win).showDefinitionForSelection();
					}
				},
			}),
			cut: decorateMenuItem({
				id: 'cut',
				label: 'Cut',
				enabled: can('Cut'),
				visible: props.isEditable,
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					props.selectionText = customItem.transform ? customItem.transform(props.selectionText) : props.selectionText;
					electron.clipboard.writeText(props.selectionText);
					getWebContents(win).delete();
				},
			}),
			copy: decorateMenuItem({
				id: 'copy',
				label: 'Copy',
				enabled: can('Copy'),
				visible: props.isEditable || hasText,
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					props.selectionText = customItem.transform ? customItem.transform(props.selectionText) : props.selectionText;
					electron.clipboard.writeText(props.selectionText);
				},
			}),
			paste: decorateMenuItem({
				id: 'paste',
				label: 'Paste',
				enabled: editFlags.canPaste,
				visible: props.isEditable,
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					let clipboardContent = electron.clipboard.readText();
					clipboardContent = customItem.transform ? customItem.transform(clipboardContent) : clipboardContent;
					void getWebContents(win).insertText(clipboardContent);
				},
			}),
			saveImage: decorateMenuItem({
				id: 'saveImage',
				label: 'Save Image',
				visible: props.mediaType === 'image',
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					props.srcURL = customItem.transform ? customItem.transform(props.srcURL) : props.srcURL;
					// download(win, props.srcURL);
				},
			}),
			saveImageAs: decorateMenuItem({
				id: 'saveImageAs',
				label: 'Save Image As…',
				visible: props.mediaType === 'image',
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					props.srcURL = customItem.transform ? customItem.transform(props.srcURL) : props.srcURL;
					// download(win, props.srcURL, {saveAs: true});
				},
			}),
			copyLink: decorateMenuItem({
				id: 'copyLink',
				label: 'Copy Link',
				visible: props.linkURL.length !== 0 && props.mediaType === 'none',
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					props.linkURL = customItem.transform ? customItem.transform(props.linkURL) : props.linkURL;

					electron.clipboard.write({
						bookmark: props.linkText,
						text: props.linkURL,
					});
				},
			}),
			copyImage: decorateMenuItem({
				id: 'copyImage',
				label: 'Copy Image',
				visible: props.mediaType === 'image',
				click() {
					getWebContents(win).copyImageAt(props.x, props.y);
				},
			}),
			copyImageAddress: decorateMenuItem({
				id: 'copyImageAddress',
				label: 'Copy Image Address',
				visible: props.mediaType === 'image',
				click(menuItem: electron.MenuItem) {
					const customItem = menuItem as unknown as ContextMenuItem;
					props.srcURL = customItem.transform ? customItem.transform(props.srcURL) : props.srcURL;

					electron.clipboard.write({
						bookmark: props.srcURL,
						text: props.srcURL,
					});
				},
			}),
			inspect: () => ({
				id: 'inspect',
				label: 'Inspect Element',
				click() {
					win.inspectElement(props.x, props.y);

					if (getWebContents(win).isDevToolsOpened()) {
						const devTools = getWebContents(win).devToolsWebContents;
						if (devTools) {
							focus('electron-context-menu', devTools);
						}
					}
				},
			}),
			services: () => ({
				id: 'services',
				label: 'Services',
				role: 'services' as const,
				visible: process.platform === 'darwin' && (props.isEditable || hasText),
			}),
		};

		const shouldShowInspectElement = typeof options.showInspectElement === 'boolean' ? options.showInspectElement : false;

		let menuTemplate: (ContextMenuItem | undefined | false)[] = [
			defaultActions.separator(),
			options.showLookUpSelection !== false && defaultActions.lookUpSelection(),
			defaultActions.separator(),
			defaultActions.cut(),
			defaultActions.copy(),
			defaultActions.paste(),
			defaultActions.separator(),
			defaultActions.saveImage(),
			options.showSaveImageAs && defaultActions.saveImageAs(),
			options.showCopyImage !== false && defaultActions.copyImage(),
			options.showCopyImageAddress && defaultActions.copyImageAddress(),
			defaultActions.separator(),
			defaultActions.copyLink(),
			defaultActions.separator(),
			shouldShowInspectElement && defaultActions.inspect(),
			options.showServices && defaultActions.services(),
			defaultActions.separator(),
		];

		if (options.menu) {
			menuTemplate = options.menu(defaultActions, props, win);
		}

		if (options.prepend) {
			const result = options.prepend(defaultActions, props, win);

			if (Array.isArray(result)) {
				menuTemplate.unshift(...result);
			}
		}

		if (options.append) {
			const result = options.append(defaultActions, props, win);

			if (Array.isArray(result)) {
				menuTemplate.push(...result);
			}
		}

		// Filter out leading/trailing separators
		// TODO: https://github.com/electron/electron/issues/5869
		menuTemplate = removeUnusedMenuItems(menuTemplate);

		for (const menuItem of menuTemplate) {
			if (!menuItem) continue;
			// Apply custom labels for default menu items
			if (options.labels && menuItem.id && options.labels[menuItem.id]) {
				menuItem.label = options.labels[menuItem.id];
			}

			// Replace placeholders in menu item labels
			// if (typeof menuItem.label === 'string' && menuItem.label.includes('{selection}')) {
			// 	const selectionString = typeof props.selectionText === 'string' ? props.selectionText.trim() : '';
			// 	menuItem.label = menuItem.label.replace('{selection}', cliTruncate(selectionString, 25));
			// }
		}

		if (menuTemplate.length > 0) {
			const remote = getElectronRemote();
			const menu = (remote ? remote.Menu : electron.Menu).buildFromTemplate(menuTemplate);

			//
			// When `electronRemote` is not available, this runs in the browser process.
			//
			// We can safely use `win` in this case as it refers to the window the
			// context-menu should open in.
			//
			// When this is being called from a web view, we can't use `win` as this
			// would refer to the web view which is not allowed to render a popup menu.
			//
			// Joplin change: Do not use electronRemote to get the current window -- this causes
			// the menu to be shown on the wrong window in MacOS.
			menu.popup({ window: win });
		}
	});
};

export default (options: ContextMenuOptions = {}) => {
	if (options.window) {
		const win = options.window;

		// When window is a webview that has not yet finished loading webContents is not available
		if (getWebContents(win) === undefined) {
			win.addEventListener('dom-ready', () => {
				create(win, options);
			}, { once: true });
			return;
		}

		return create(win, options);
	}

	const remote = getElectronRemote();

	for (const win of (electron.BrowserWindow || (remote && remote.BrowserWindow)).getAllWindows()) {
		create(win, options);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- event is unused but required by electron signature
	(electron.app || (remote && remote.app)).on('browser-window-created', (_event: any, win: any) => {
		create(win, options);
	});
};
