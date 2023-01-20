"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.indentEntry = void 0;
const indentEntry = (indentation, entry) => {
    switch (indentation) {
        case "Indent" /* Indentation.Indent */:
            entry.depth++;
            break;
        case "Outdent" /* Indentation.Outdent */:
            entry.depth--;
            break;
        case "Flatten" /* Indentation.Flatten */:
            entry.depth = 0;
    }
};
exports.indentEntry = indentEntry;
//# sourceMappingURL=Indentation.js.map