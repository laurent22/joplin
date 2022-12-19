import { SubPath, urlMatchesSchema } from '../routeUtils';

export type MenuItemSelectedCondition = (selectedUrl: SubPath)=> boolean;

export interface MenuItem {
	title: string;
	url?: string;
	children?: MenuItem[];
	selected?: boolean;
	icon?: string;
	selectedCondition?: MenuItemSelectedCondition;
}

export const setSelectedMenu = (selectedPath: SubPath, menuItems: MenuItem[]) => {
	if (!selectedPath) return menuItems;
	if (!menuItems) return menuItems;

	menuItems = menuItems.slice();

	for (let i = 0; i < menuItems.length; i++) {
		const menuItem = menuItems[i];
		let selected = menuItem.selected;
		if (menuItem.url) {
			if (menuItem.selectedCondition) {
				selected = menuItem.selectedCondition(selectedPath);
			} else {
				selected = urlMatchesSchema(menuItem.url, selectedPath.schema);
			}
		}

		menuItems[i] = {
			...menuItem,
			selected,
			children: setSelectedMenu(selectedPath, menuItem.children),
		};
	}

	return menuItems;
};
