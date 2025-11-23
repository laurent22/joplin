"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const KeymapService_1 = require("../../KeymapService");
const types_1 = require("./types");
const MenuController_1 = require("../MenuController");
const createViewHandle_1 = require("../utils/createViewHandle");
/**
 * Allows creating menus.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/menu)
 *
 * <span class="platform-desktop">desktop</span>
 */
class JoplinViewsMenus {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(plugin, store) {
        this.store = store;
        this.plugin = plugin;
    }
    registerCommandAccelerators(menuItems) {
        for (const menuItem of menuItems) {
            if (menuItem.accelerator) {
                KeymapService_1.default.instance().registerCommandAccelerator(menuItem.commandName, menuItem.accelerator);
            }
            if (menuItem.submenu) {
                this.registerCommandAccelerators(menuItem.submenu);
            }
        }
    }
    /**
     * Creates a new menu from the provided menu items and place it at the given location. As of now, it is only possible to place the
     * menu as a sub-menu of the application build-in menus.
     */
    async create(id, label, menuItems, location = types_1.MenuItemLocation.Tools) {
        if (!Array.isArray(menuItems)) {
            this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.menus.create("my-unique-id", ...)`', true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            location = menuItems || types_1.MenuItemLocation.Tools;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            menuItems = label;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            label = id;
            id = `${this.plugin.viewCount}`;
        }
        const handle = (0, createViewHandle_1.default)(this.plugin, id);
        const controller = new MenuController_1.default(handle, this.plugin.id, this.store, label, menuItems, location);
        this.plugin.addViewController(controller);
        this.registerCommandAccelerators(menuItems);
    }
}
exports.default = JoplinViewsMenus;
