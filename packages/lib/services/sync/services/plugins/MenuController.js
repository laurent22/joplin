"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ViewController_1 = require("./ViewController");
class MenuController extends ViewController_1.default {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(id, pluginId, store, label, menuItems, location) {
        super(id, pluginId, store);
        this.store.dispatch({
            type: 'PLUGIN_VIEW_ADD',
            pluginId: pluginId,
            view: {
                id: this.handle,
                type: this.type,
                label: label,
                menuItems: menuItems,
                location: location,
            },
        });
    }
    get type() {
        return 'menu';
    }
}
exports.default = MenuController;
