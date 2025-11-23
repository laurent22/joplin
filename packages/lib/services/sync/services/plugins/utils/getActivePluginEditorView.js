"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const getActivePluginEditorViews_1 = require("./getActivePluginEditorViews");
const logger = Logger_1.default.create('getActivePluginEditorView');
exports.default = (plugins, windowId) => {
    const allActiveViews = (0, getActivePluginEditorViews_1.default)(plugins, windowId);
    if (allActiveViews.length === 0) {
        return { editorPlugin: null, editorView: null };
    }
    const result = allActiveViews[0];
    if (allActiveViews.length > 1) {
        const ignoredPluginIds = allActiveViews.slice(1).map(({ editorPlugin }) => editorPlugin.id);
        logger.warn(`More than one editor plugin are active for this note. Active plugin: ${result.editorPlugin.id}. Ignored plugins: ${ignoredPluginIds.join(',')}`);
    }
    return allActiveViews[0];
};
