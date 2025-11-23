"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createViewHandle;
function createViewHandle(plugin, id) {
    if (!id)
        throw new Error('A view ID must be provided');
    return `plugin-view-${plugin.id}-${id}`;
}
