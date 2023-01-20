"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSelectedMenu = void 0;
const routeUtils_1 = require("../routeUtils");
const setSelectedMenu = (selectedPath, menuItems) => {
    if (!selectedPath)
        return menuItems;
    if (!menuItems)
        return menuItems;
    menuItems = menuItems.slice();
    for (let i = 0; i < menuItems.length; i++) {
        const menuItem = menuItems[i];
        let selected = menuItem.selected;
        if (menuItem.url) {
            if (menuItem.selectedCondition) {
                selected = menuItem.selectedCondition(selectedPath);
            }
            else {
                selected = (0, routeUtils_1.urlMatchesSchema)(menuItem.url, selectedPath.schema);
            }
        }
        menuItems[i] = Object.assign(Object.assign({}, menuItem), { selected, children: (0, exports.setSelectedMenu)(selectedPath, menuItem.children) });
    }
    return menuItems;
};
exports.setSelectedMenu = setSelectedMenu;
//# sourceMappingURL=menu.js.map