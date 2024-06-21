
import type { ElectronApplication } from '@playwright/test';
import type { MenuItem } from 'electron';


// Roughly based on
// https://github.com/spaceagetv/electron-playwright-helpers/blob/main/src/menu_helpers.ts

// If given, `parentMenuLabel` should be the label of the menu containing the target item.
const activateMainMenuItem = (
	electronApp: ElectronApplication,
	targetItemLabel: string,
	parentMenuLabel?: string,
) => {
	return electronApp.evaluate(async ({ Menu }, [targetItemLabel, parentMenuLabel]) => {
		const activateItemInSubmenu = (submenu: MenuItem[], parentLabel: string) => {
			for (const item of submenu) {
				const matchesParent = !parentMenuLabel || parentLabel === parentMenuLabel;
				if (item.label === targetItemLabel && matchesParent && item.visible) {
					// Found!
					item.click();
					return true;
				} else if (item.submenu) {
					const foundItem = activateItemInSubmenu(item.submenu.items, item.label);

					if (foundItem) {
						return true;
					}
				}
			}

			// No item found
			return false;
		};

		const appMenu = Menu.getApplicationMenu();
		return activateItemInSubmenu(appMenu.items, '');
	}, [targetItemLabel, parentMenuLabel]);
};

export default activateMainMenuItem;
