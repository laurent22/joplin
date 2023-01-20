"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRange = exports.getNormalizedPoint = void 0;
const RangeUtils_1 = require("tinymce/core/api/dom/RangeUtils");
const NodeType = require("./NodeType");
const getNormalizedPoint = (container, offset) => {
    if (NodeType.isTextNode(container)) {
        return { container, offset };
    }
    const node = RangeUtils_1.default.getNode(container, offset);
    if (NodeType.isTextNode(node)) {
        return {
            container: node,
            offset: offset >= container.childNodes.length ? node.data.length : 0
        };
    }
    else if (node.previousSibling && NodeType.isTextNode(node.previousSibling)) {
        return {
            container: node.previousSibling,
            offset: node.previousSibling.data.length
        };
    }
    else if (node.nextSibling && NodeType.isTextNode(node.nextSibling)) {
        return {
            container: node.nextSibling,
            offset: 0
        };
    }
    return { container, offset };
};
exports.getNormalizedPoint = getNormalizedPoint;
const normalizeRange = (rng) => {
    const outRng = rng.cloneRange();
    const rangeStart = getNormalizedPoint(rng.startContainer, rng.startOffset);
    outRng.setStart(rangeStart.container, rangeStart.offset);
    const rangeEnd = getNormalizedPoint(rng.endContainer, rng.endOffset);
    outRng.setEnd(rangeEnd.container, rangeEnd.offset);
    return outRng;
};
exports.normalizeRange = normalizeRange;
//# sourceMappingURL=Range.js.map