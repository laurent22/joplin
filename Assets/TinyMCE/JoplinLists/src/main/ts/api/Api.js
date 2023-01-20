"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = void 0;
const Delete = require("../core/Delete");
const get = function (editor) {
    return {
        backspaceDelete(isForward) {
            Delete.backspaceDelete(editor, isForward);
        }
    };
};
exports.get = get;
//# sourceMappingURL=Api.js.map