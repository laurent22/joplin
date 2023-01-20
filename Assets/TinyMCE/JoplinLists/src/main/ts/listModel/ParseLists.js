"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLists = void 0;
const katamari_1 = require("@ephox/katamari");
const sugar_1 = require("@ephox/sugar");
const Entry_1 = require("./Entry");
const Util_1 = require("./Util");
const parseItem = (depth, itemSelection, selectionState, item) => {
    return sugar_1.Traverse.firstChild(item).filter(Util_1.isList).fold(() => {
        // Update selectionState (start)
        itemSelection.each((selection) => {
            if (sugar_1.Compare.eq(selection.start, item)) {
                selectionState.set(true);
            }
        });
        const currentItemEntry = (0, Entry_1.createEntry)(item, depth, selectionState.get());
        // Update selectionState (end)
        itemSelection.each((selection) => {
            if (sugar_1.Compare.eq(selection.end, item)) {
                selectionState.set(false);
            }
        });
        const childListEntries = sugar_1.Traverse.lastChild(item)
            .filter(Util_1.isList)
            .map((list) => parseList(depth, itemSelection, selectionState, list))
            .getOr([]);
        return currentItemEntry.toArray().concat(childListEntries);
    }, (list) => parseList(depth, itemSelection, selectionState, list));
};
const parseList = (depth, itemSelection, selectionState, list) => {
    return katamari_1.Arr.bind(sugar_1.Traverse.children(list), (element) => {
        const parser = (0, Util_1.isList)(element) ? parseList : parseItem;
        const newDepth = depth + 1;
        return parser(newDepth, itemSelection, selectionState, element);
    });
};
const parseLists = (lists, itemSelection) => {
    const selectionState = (0, katamari_1.Cell)(false);
    const initialDepth = 0;
    return katamari_1.Arr.map(lists, (list) => ({
        sourceList: list,
        entries: parseList(initialDepth, itemSelection, selectionState, list)
    }));
};
exports.parseLists = parseLists;
//# sourceMappingURL=ParseLists.js.map