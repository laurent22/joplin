"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.backspaceDelete = exports.setup = void 0;
const katamari_1 = require("@ephox/katamari");
const sugar_1 = require("@ephox/sugar");
// import DOMUtils from 'tinymce/core/api/dom/DOMUtils';
const RangeUtils_1 = require("tinymce/core/api/dom/RangeUtils");
const TreeWalker_1 = require("tinymce/core/api/dom/TreeWalker");
const VK_1 = require("tinymce/core/api/util/VK");
const Indendation_1 = require("../actions/Indendation");
const ToggleList = require("../actions/ToggleList");
const Bookmark = require("./Bookmark");
const NodeType = require("./NodeType");
const NormalizeLists = require("./NormalizeLists");
const Range = require("./Range");
const Selection = require("./Selection");
const findNextCaretContainer = function (editor, rng, isForward, root) {
    let node = rng.startContainer;
    const offset = rng.startOffset;
    if (NodeType.isTextNode(node) && (isForward ? offset < node.data.length : offset > 0)) {
        return node;
    }
    const nonEmptyBlocks = editor.schema.getNonEmptyElements();
    if (node.nodeType === 1) {
        node = RangeUtils_1.default.getNode(node, offset);
    }
    const walker = new TreeWalker_1.default(node, root);
    // Delete at <li>|<br></li> then jump over the bogus br
    if (isForward) {
        if (NodeType.isBogusBr(editor.dom, node)) {
            walker.next();
        }
    }
    while ((node = walker[isForward ? 'next' : 'prev2']())) {
        if (node.nodeName === 'LI' && !node.hasChildNodes()) {
            return node;
        }
        if (nonEmptyBlocks[node.nodeName]) {
            return node;
        }
        if (NodeType.isTextNode(node) && node.data.length > 0) {
            return node;
        }
    }
};
const hasOnlyOneBlockChild = function (dom, elm) {
    const childNodes = elm.childNodes;
    return childNodes.length === 1 && !NodeType.isListNode(childNodes[0]) && dom.isBlock(childNodes[0]);
};
const unwrapSingleBlockChild = function (dom, elm) {
    if (hasOnlyOneBlockChild(dom, elm)) {
        dom.remove(elm.firstChild, true);
    }
};
const moveChildren = function (dom, fromElm, toElm) {
    let node, targetElm;
    targetElm = hasOnlyOneBlockChild(dom, toElm) ? toElm.firstChild : toElm;
    unwrapSingleBlockChild(dom, fromElm);
    if (!NodeType.isEmpty(dom, fromElm, true)) {
        while ((node = fromElm.firstChild)) {
            targetElm.appendChild(node);
        }
    }
};
const mergeLiElements = function (dom, fromElm, toElm) {
    let node, listNode;
    const ul = fromElm.parentNode;
    if (!NodeType.isChildOfBody(dom, fromElm) || !NodeType.isChildOfBody(dom, toElm)) {
        return;
    }
    if (NodeType.isListNode(toElm.lastChild)) {
        listNode = toElm.lastChild;
    }
    if (ul === toElm.lastChild) {
        if (NodeType.isBr(ul.previousSibling)) {
            dom.remove(ul.previousSibling);
        }
    }
    node = toElm.lastChild;
    if (node && NodeType.isBr(node) && fromElm.hasChildNodes()) {
        dom.remove(node);
    }
    if (NodeType.isEmpty(dom, toElm, true)) {
        dom.$(toElm).empty();
    }
    moveChildren(dom, fromElm, toElm);
    if (listNode) {
        toElm.appendChild(listNode);
    }
    const contains = sugar_1.Compare.contains(sugar_1.Element.fromDom(toElm), sugar_1.Element.fromDom(fromElm));
    const nestedLists = contains ? dom.getParents(fromElm, NodeType.isListNode, toElm) : [];
    dom.remove(fromElm);
    katamari_1.Arr.each(nestedLists, (list) => {
        if (NodeType.isEmpty(dom, list) && list !== dom.getRoot()) {
            dom.remove(list);
        }
    });
};
const mergeIntoEmptyLi = function (editor, fromLi, toLi) {
    editor.dom.$(toLi).empty();
    mergeLiElements(editor.dom, fromLi, toLi);
    editor.selection.setCursorLocation(toLi);
};
const mergeForward = function (editor, rng, fromLi, toLi) {
    const dom = editor.dom;
    if (dom.isEmpty(toLi)) {
        mergeIntoEmptyLi(editor, fromLi, toLi);
    }
    else {
        const bookmark = Bookmark.createBookmark(rng);
        mergeLiElements(dom, fromLi, toLi);
        editor.selection.setRng(Bookmark.resolveBookmark(bookmark));
    }
};
const mergeBackward = function (editor, rng, fromLi, toLi) {
    const bookmark = Bookmark.createBookmark(rng);
    mergeLiElements(editor.dom, fromLi, toLi);
    const resolvedBookmark = Bookmark.resolveBookmark(bookmark);
    editor.selection.setRng(resolvedBookmark);
};
const backspaceDeleteFromListToListCaret = function (editor, isForward) {
    const dom = editor.dom, selection = editor.selection;
    const selectionStartElm = selection.getStart();
    const root = Selection.getClosestListRootElm(editor, selectionStartElm);
    const li = dom.getParent(selection.getStart(), 'LI', root);
    if (li) {
        const ul = li.parentNode;
        if (ul === editor.getBody() && NodeType.isEmpty(dom, ul)) {
            return true;
        }
        const rng = Range.normalizeRange(selection.getRng());
        const otherLi = dom.getParent(findNextCaretContainer(editor, rng, isForward, root), 'LI', root);
        if (otherLi && otherLi !== li) {
            editor.undoManager.transact(() => {
                if (isForward) {
                    mergeForward(editor, rng, otherLi, li);
                }
                else {
                    if (NodeType.isFirstChild(li)) {
                        (0, Indendation_1.outdentListSelection)(editor);
                    }
                    else {
                        mergeBackward(editor, rng, li, otherLi);
                    }
                }
            });
            return true;
        }
        else if (!otherLi) {
            if (!isForward && rng.startOffset === 0 && rng.endOffset === 0) {
                editor.undoManager.transact(() => {
                    (0, Indendation_1.flattenListSelection)(editor);
                });
                return true;
            }
        }
    }
    return false;
};
const removeBlock = function (dom, block, root) {
    const parentBlock = dom.getParent(block.parentNode, dom.isBlock, root);
    dom.remove(block);
    if (parentBlock && dom.isEmpty(parentBlock)) {
        dom.remove(parentBlock);
    }
};
const backspaceDeleteIntoListCaret = function (editor, isForward) {
    const dom = editor.dom;
    const selectionStartElm = editor.selection.getStart();
    const root = Selection.getClosestListRootElm(editor, selectionStartElm);
    const block = dom.getParent(selectionStartElm, dom.isBlock, root);
    if (block && dom.isEmpty(block)) {
        const rng = Range.normalizeRange(editor.selection.getRng());
        const otherLi = dom.getParent(findNextCaretContainer(editor, rng, isForward, root), 'LI', root);
        if (otherLi) {
            editor.undoManager.transact(function () {
                removeBlock(dom, block, root);
                ToggleList.mergeWithAdjacentLists(dom, otherLi.parentNode);
                editor.selection.select(otherLi, true);
                editor.selection.collapse(isForward);
            });
            return true;
        }
    }
    return false;
};
const backspaceDeleteCaret = function (editor, isForward) {
    return backspaceDeleteFromListToListCaret(editor, isForward) || backspaceDeleteIntoListCaret(editor, isForward);
};
const backspaceDeleteRange = function (editor) {
    const selectionStartElm = editor.selection.getStart();
    const root = Selection.getClosestListRootElm(editor, selectionStartElm);
    const startListParent = editor.dom.getParent(selectionStartElm, 'LI,DT,DD', root);
    if (startListParent || Selection.getSelectedListItems(editor).length > 0) {
        editor.undoManager.transact(function () {
            editor.execCommand('Delete');
            NormalizeLists.normalizeLists(editor.dom, editor.getBody());
        });
        return true;
    }
    return false;
};
const backspaceDelete = function (editor, isForward) {
    return editor.selection.isCollapsed() ? backspaceDeleteCaret(editor, isForward) : backspaceDeleteRange(editor);
};
exports.backspaceDelete = backspaceDelete;
const setup = function (editor) {
    editor.on('keydown', function (e) {
        if (e.keyCode === VK_1.default.BACKSPACE) {
            if (backspaceDelete(editor, false)) {
                e.preventDefault();
            }
        }
        else if (e.keyCode === VK_1.default.DELETE) {
            if (backspaceDelete(editor, true)) {
                e.preventDefault();
            }
        }
    });
};
exports.setup = setup;
//# sourceMappingURL=Delete.js.map