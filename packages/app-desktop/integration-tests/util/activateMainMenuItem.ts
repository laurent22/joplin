
import { expect, type ElectronApplication } from '@playwright/test';
import type { MenuItem } from 'electron';


// Roughly based on
// https://github.com/spaceagetv/electron-playwright-helpers/blob/main/src/menu_helpers.ts

// If given, `parentMenuLabel` should be the label of the menu containing the target item.
const activateMainMenuItem = async (
	electronApp: ElectronApplication,
	targetItemLabel: string|RegExp,
	parentMenuLabel?: string,
) => {
	await expect.poll(() => {
		return electronApp.evaluate(async ({ Menu }, [targetItemLabel, parentMenuLabel]) => {
			const activateItemInSubmenu = (submenu: MenuItem[], parentLabel: string) => {
				for (const item of submenu) {
					const matchesParent = !parentMenuLabel || parentLabel === parentMenuLabel;
					const matchesLabel = typeof targetItemLabel === 'string' ? (
						targetItemLabel === item.label
					) : (
						item.label.match(targetItemLabel)
					);

					if (matchesLabel && matchesParent && item.visible) {
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
			return !!appMenu && activateItemInSubmenu(appMenu.items, '');
		}, [targetItemLabel, parentMenuLabel]);
	}, {
		message: `should find and activate menu item with label ${JSON.stringify(targetItemLabel)}`,
	}).toBe(true);
};

export default activateMainMenuItem;
