"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebviewController_1 = require("../WebviewController");
exports.default = (plugins, windowId, { mustBeVisible = false } = {}) => {
    const output = [];
    for (const [, pluginState] of Object.entries(plugins)) {
        for (const [, view] of Object.entries(pluginState.views)) {
            if (view.type !== 'webview' || view.containerType !== WebviewController_1.ContainerType.Editor)
                continue;
            if (view.parentWindowId !== windowId || !view.active)
                continue;
            output.push({ editorPlugin: pluginState, editorView: view });
        }
    }
    if (mustBeVisible) {
        // Filter out views that haven't been shown:
        return output.filter(({ editorView }) => editorView.opened);
    }
    return output;
};
