
import type { ElectronApplication } from '@playwright/test';
import type { MenuItem } from 'electron';


// Roughly based on
// https://github.com/spaceagetv/electron-playwright-helpers/blob/main/src/menu_helpers.ts

// `menuItemPath` should be a list of menu labels (e.g. [["&JoplinMainMenu", "&File"], "Synchronise"]).
const activateMainMenuItem = (electronApp: ElectronApplication, menuItemLabel: string) => {
	return electronApp.evaluate(async ({ Menu }, menuItemLabel) => {
		const activateItemInSubmenu = (submenu: MenuItem[]) => {
			for (const item of submenu) {
				if (item.label === menuItemLabel && item.visible) {
					// Found!
					item.click();
					return true;
				} else if (item.submenu) {
					const foundItem = activateItemInSubmenu(item.submenu.items);

					if (foundItem) {
						return true;
					}
				}
			}

			// No item found
			return false;
		};

		const appMenu = Menu.getApplicationMenu();
		return activateItemInSubmenu(appMenu.items);
	}, menuItemLabel);
};

export default activateMainMenuItem;
