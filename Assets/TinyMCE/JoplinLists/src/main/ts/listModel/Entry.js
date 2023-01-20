"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSelected = exports.isIndented = exports.createEntry = void 0;
const sugar_1 = require("@ephox/sugar");
const katamari_1 = require("@ephox/katamari");
const Util_1 = require("./Util");
const isIndented = (entry) => {
    return entry.depth > 0;
};
exports.isIndented = isIndented;
const isSelected = (entry) => {
    return entry.isSelected;
};
exports.isSelected = isSelected;
const cloneItemContent = (li) => {
    const children = sugar_1.Traverse.children(li);
    const content = (0, Util_1.hasLastChildList)(li) ? children.slice(0, -1) : children;
    return katamari_1.Arr.map(content, sugar_1.Replication.deep);
};
const createEntry = (li, depth, isSelected) => {
    return sugar_1.Traverse.parent(li).filter(sugar_1.Node.isElement).map((list) => {
        return {
            depth,
            isSelected,
            content: cloneItemContent(li),
            itemAttributes: sugar_1.Attr.clone(li),
            listAttributes: sugar_1.Attr.clone(list),
            listType: sugar_1.Node.name(list)
        };
    });
};
exports.createEntry = createEntry;
//# sourceMappingURL=Entry.js.map