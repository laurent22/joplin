"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLists = exports.normalizeList = void 0;
const DOMUtils_1 = require("tinymce/core/api/dom/DOMUtils");
const Tools_1 = require("tinymce/core/api/util/Tools");
const NodeType = require("./NodeType");
const DOM = DOMUtils_1.default.DOM;
const normalizeList = function (dom, ul) {
    let sibling;
    const parentNode = ul.parentNode;
    // Move UL/OL to previous LI if it's the only child of a LI
    if (parentNode.nodeName === 'LI' && parentNode.firstChild === ul) {
        sibling = parentNode.previousSibling;
        if (sibling && sibling.nodeName === 'LI') {
            sibling.appendChild(ul);
            if (NodeType.isEmpty(dom, parentNode)) {
                DOM.remove(parentNode);
            }
        }
        else {
            DOM.setStyle(parentNode, 'listStyleType', 'none');
        }
    }
    // Append OL/UL to previous LI if it's in a parent OL/UL i.e. old HTML4
    if (NodeType.isListNode(parentNode)) {
        sibling = parentNode.previousSibling;
        if (sibling && sibling.nodeName === 'LI') {
            sibling.appendChild(ul);
        }
    }
};
exports.normalizeList = normalizeList;
const normalizeLists = function (dom, element) {
    Tools_1.default.each(Tools_1.default.grep(dom.select('ol,ul', element)), function (ul) {
        normalizeList(dom, ul);
    });
};
exports.normalizeLists = normalizeLists;
//# sourceMappingURL=NormalizeLists.js.map