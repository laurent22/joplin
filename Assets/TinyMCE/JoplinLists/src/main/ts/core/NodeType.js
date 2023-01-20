"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isChildOfBody = exports.isEmpty = exports.isBogusBr = exports.isBlock = exports.isTextBlock = exports.isLastChild = exports.isFirstChild = exports.isBr = exports.isTableCellNode = exports.isListItemNode = exports.isDlItemNode = exports.isOlUlNode = exports.isListNode = exports.isTextNode = void 0;
const isTextNode = function (node) {
    return node && node.nodeType === 3;
};
exports.isTextNode = isTextNode;
const isListNode = function (node) {
    return node && (/^(OL|UL|DL)$/).test(node.nodeName);
};
exports.isListNode = isListNode;
const isOlUlNode = function (node) {
    return node && (/^(OL|UL)$/).test(node.nodeName);
};
exports.isOlUlNode = isOlUlNode;
const isListItemNode = function (node) {
    return node && /^(LI|DT|DD)$/.test(node.nodeName);
};
exports.isListItemNode = isListItemNode;
const isDlItemNode = function (node) {
    return node && /^(DT|DD)$/.test(node.nodeName);
};
exports.isDlItemNode = isDlItemNode;
const isTableCellNode = function (node) {
    return node && /^(TH|TD)$/.test(node.nodeName);
};
exports.isTableCellNode = isTableCellNode;
const isBr = function (node) {
    return node && node.nodeName === 'BR';
};
exports.isBr = isBr;
const isFirstChild = function (node) {
    return node.parentNode.firstChild === node;
};
exports.isFirstChild = isFirstChild;
const isLastChild = function (node) {
    return node.parentNode.lastChild === node;
};
exports.isLastChild = isLastChild;
const isTextBlock = function (editor, node) {
    return node && !!editor.schema.getTextBlockElements()[node.nodeName];
};
exports.isTextBlock = isTextBlock;
const isBlock = function (node, blockElements) {
    return node && node.nodeName in blockElements;
};
exports.isBlock = isBlock;
const isBogusBr = function (dom, node) {
    if (!isBr(node)) {
        return false;
    }
    if (dom.isBlock(node.nextSibling) && !isBr(node.previousSibling)) {
        return true;
    }
    return false;
};
exports.isBogusBr = isBogusBr;
const isEmpty = function (dom, elm, keepBookmarks) {
    const empty = dom.isEmpty(elm);
    if (keepBookmarks && dom.select('span[data-mce-type=bookmark]', elm).length > 0) {
        return false;
    }
    return empty;
};
exports.isEmpty = isEmpty;
const isChildOfBody = function (dom, elm) {
    return dom.isChildOf(elm, dom.getRoot());
};
exports.isChildOfBody = isChildOfBody;
//# sourceMappingURL=NodeType.js.map