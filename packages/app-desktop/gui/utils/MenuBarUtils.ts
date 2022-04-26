import { ipcMain, Menu } from 'electron';
import { ipcRenderer } from 'electron';

export interface MenuItemPropsMap { [menuItemId: string]: { [key: string]: any } }

const channel = 'setMenuBarMenuItemProps';

// This function can be called only in Electron's main process.
export function ipcMainOnSetMenuBarMenuItemProps() {

	const setMenuBarMenuItemPropsListener = (_event: any, args: any) => {
		// Message to change multiple properties of multiple MenuItems at once.
		// It is very time-consumig to change a MenuItem's property from the renderer process,
		// because of IPC overheads. This message enables to reduce such overheads by
		// packing multiple operations into one message.
		if (args && typeof args === 'object') {
			const menuItemPropsMap: MenuItemPropsMap = args;
			const menu = Menu.getApplicationMenu();
			if (menu) {
				for (const [id, props] of Object.entries(menuItemPropsMap)) {
					const menuItem = menu.getMenuItemById(id);
					if (!menuItem || !props || typeof props !== 'object') continue;
					for (const [key, value] of Object.entries(props)) {
						if (key !== 'visible' && key !== 'enabled' && key !== 'checked') continue;
						menuItem[key] = !!value;
					}
				}
			}
		}
	};

	ipcMain.on(channel, setMenuBarMenuItemPropsListener);

	// returns a function removing this listener
	return () => ipcMain.off(channel, setMenuBarMenuItemPropsListener);
}

// The following function can be called in any process.

export function prepareMenuItemChecked(propsMap: MenuItemPropsMap, menuItemId: string, value: boolean) {
	(propsMap[menuItemId] ??= {}).checked = value;
}

export function prepareMenuItemEnabled(propsMap: MenuItemPropsMap, menuItemId: string, value: boolean) {
	(propsMap[menuItemId] ??= {}).enabled = value;
}

export function prepareMenuItemVisible(propsMap: MenuItemPropsMap, menuItemId: string, value: boolean) {
	(propsMap[menuItemId] ??= {}).visible = value;
}

export function setMenuBarMenuItemProps(propsMap: MenuItemPropsMap) {
	ipcRenderer.send(channel, propsMap);
}
