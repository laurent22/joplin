"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const ToolbarButtonController_1 = require("../ToolbarButtonController");
const createViewHandle_1 = require("../utils/createViewHandle");
/**
 * Allows creating and managing toolbar buttons.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 */
class JoplinViewsToolbarButtons {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(plugin, store) {
        this.store = store;
        this.plugin = plugin;
    }
    /**
     * Creates a new toolbar button and associate it with the given command.
     */
    async create(id, commandName, location) {
        if (arguments.length < 3) {
            this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.toolbarButtons.create("my-unique-id", ...)`', true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            location = commandName;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            commandName = id;
            id = `${this.plugin.viewCount}`;
        }
        const handle = (0, createViewHandle_1.default)(this.plugin, id);
        const controller = new ToolbarButtonController_1.default(handle, this.plugin.id, this.store, commandName, location);
        this.plugin.addViewController(controller);
    }
}
exports.default = JoplinViewsToolbarButtons;
