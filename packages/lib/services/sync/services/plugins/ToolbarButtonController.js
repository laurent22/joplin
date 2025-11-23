"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ViewController_1 = require("./ViewController");
class ToolbarButtonController extends ViewController_1.default {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(id, pluginId, store, commandName, location) {
        super(id, pluginId, store);
        this.store.dispatch({
            type: 'PLUGIN_VIEW_ADD',
            pluginId: pluginId,
            view: {
                id: this.handle,
                type: this.type,
                commandName: commandName,
                location: location,
            },
        });
    }
    get type() {
        return 'toolbarButton';
    }
}
exports.default = ToolbarButtonController;
