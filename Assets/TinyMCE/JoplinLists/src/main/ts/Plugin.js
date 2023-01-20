"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
const PluginManager_1 = require("tinymce/core/api/PluginManager");
const Api = require("./api/Api");
const Commands = require("./api/Commands");
const Keyboard = require("./core/Keyboard");
const Mouse = require("./core/Mouse");
const Buttons = require("./ui/Buttons");
function default_1() {
    PluginManager_1.default.add('joplinLists', function (editor) {
        Keyboard.setup(editor);
        Mouse.setup(editor);
        Buttons.register(editor);
        Commands.register(editor);
        return Api.get(editor);
    });
}
exports.default = default_1;
//# sourceMappingURL=Plugin.js.map