"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasLastChildList = exports.hasFirstChildList = exports.isList = void 0;
const sugar_1 = require("@ephox/sugar");
const isList = (el) => {
    return sugar_1.Compare.is(el, 'OL,UL');
};
exports.isList = isList;
const hasFirstChildList = (el) => {
    return sugar_1.Traverse.firstChild(el).map(isList).getOr(false);
};
exports.hasFirstChildList = hasFirstChildList;
const hasLastChildList = (el) => {
    return sugar_1.Traverse.lastChild(el).map(isList).getOr(false);
};
exports.hasLastChildList = hasLastChildList;
//# sourceMappingURL=Util.js.map