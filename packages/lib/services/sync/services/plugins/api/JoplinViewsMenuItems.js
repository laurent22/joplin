"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const KeymapService_1 = require("../../KeymapService");
const types_1 = require("./types");
const MenuItemController_1 = require("../MenuItemController");
const createViewHandle_1 = require("../utils/createViewHandle");
/**
 * Allows creating and managing menu items.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 *
 * <span class="platform-desktop">desktop</span>
 */
class JoplinViewsMenuItems {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(plugin, store) {
        this.store = store;
        this.plugin = plugin;
    }
    /**
     * Creates a new menu item and associate it with the given command. You can specify under which menu the item should appear using the `location` parameter.
     */
    async create(id, commandName, location = types_1.MenuItemLocation.Tools, options = null) {
        if (typeof location !== 'string') {
            this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.menuItem.create("my-unique-id", ...)`', true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            options = location;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            location = commandName || types_1.MenuItemLocation.Tools;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            commandName = id;
            id = `${this.plugin.viewCount}`;
        }
        const handle = (0, createViewHandle_1.default)(this.plugin, id);
        const controller = new MenuItemController_1.default(handle, this.plugin.id, this.store, commandName, location);
        this.plugin.addViewController(controller);
        // Register the command with the keymap service - not that if no
        // accelerator is provided, we still register the command, so that
        // it appears in the keymap editor, which will allow the user to
        // set a custom shortcut.
        //
        // https://discourse.joplinapp.org/t/plugin-note-tabs/12752/39
        if (options && options.accelerator) {
            KeymapService_1.default.instance().registerCommandAccelerator(commandName, options.accelerator);
        }
        else {
            KeymapService_1.default.instance().registerCommandAccelerator(commandName, null);
        }
    }
}
exports.default = JoplinViewsMenuItems;
