"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dlIndentation = void 0;
const sugar_1 = require("@ephox/sugar");
const SplitList = require("./SplitList");
const katamari_1 = require("@ephox/katamari");
const outdentDlItem = (editor, item) => {
    if (sugar_1.Compare.is(item, 'dd')) {
        sugar_1.Replication.mutate(item, 'dt');
    }
    else if (sugar_1.Compare.is(item, 'dt')) {
        sugar_1.Traverse.parent(item).each((dl) => SplitList.splitList(editor, dl.dom(), item.dom()));
    }
};
const indentDlItem = (item) => {
    if (sugar_1.Compare.is(item, 'dt')) {
        sugar_1.Replication.mutate(item, 'dd');
    }
};
const dlIndentation = (editor, indentation, dlItems) => {
    if (indentation === "Indent" /* Indentation.Indent */) {
        katamari_1.Arr.each(dlItems, indentDlItem);
    }
    else {
        katamari_1.Arr.each(dlItems, (item) => outdentDlItem(editor, item));
    }
};
exports.dlIndentation = dlIndentation;
//# sourceMappingURL=DlIndentation.js.map