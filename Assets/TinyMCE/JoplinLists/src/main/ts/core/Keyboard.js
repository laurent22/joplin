"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = void 0;
const VK_1 = require("tinymce/core/api/util/VK");
const Settings = require("../api/Settings");
const Delete = require("./Delete");
const Indendation_1 = require("../actions/Indendation");
const setupTabKey = function (editor) {
    editor.on('keydown', function (e) {
        // Check for tab but not ctrl/cmd+tab since it switches browser tabs
        if (e.keyCode !== VK_1.default.TAB || VK_1.default.metaKeyPressed(e)) {
            return;
        }
        editor.undoManager.transact(() => {
            if (e.shiftKey ? (0, Indendation_1.outdentListSelection)(editor) : (0, Indendation_1.indentListSelection)(editor)) {
                e.preventDefault();
            }
        });
    });
};
const setup = function (editor) {
    if (Settings.shouldIndentOnTab(editor)) {
        setupTabKey(editor);
    }
    Delete.setup(editor);
};
exports.setup = setup;
//# sourceMappingURL=Keyboard.js.map