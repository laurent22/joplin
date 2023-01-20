"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEntries = void 0;
const katamari_1 = require("@ephox/katamari");
const cloneListProperties = (target, source) => {
    target.listType = source.listType;
    target.listAttributes = Object.assign({}, source.listAttributes);
};
// Closest entry above in the same list
const previousSiblingEntry = (entries, start) => {
    const depth = entries[start].depth;
    for (let i = start - 1; i >= 0; i--) {
        if (entries[i].depth === depth) {
            return katamari_1.Option.some(entries[i]);
        }
        if (entries[i].depth < depth) {
            break;
        }
    }
    return katamari_1.Option.none();
};
const normalizeEntries = (entries) => {
    katamari_1.Arr.each(entries, (entry, i) => {
        previousSiblingEntry(entries, i).each((matchingEntry) => {
            cloneListProperties(entry, matchingEntry);
        });
    });
};
exports.normalizeEntries = normalizeEntries;
//# sourceMappingURL=NormalizeEntries.js.map