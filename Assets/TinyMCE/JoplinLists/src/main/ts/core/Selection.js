"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectedListRoots = exports.getSelectedDlItems = exports.getClosestListRootElm = exports.getSelectedListItems = exports.getSelectedSubLists = exports.getParentList = exports.isList = void 0;
const katamari_1 = require("@ephox/katamari");
const sand_1 = require("@ephox/sand");
const DomQuery_1 = require("tinymce/core/api/dom/DomQuery");
const Tools_1 = require("tinymce/core/api/util/Tools");
const NodeType = require("./NodeType");
const getParentList = function (editor) {
    const selectionStart = editor.selection.getStart(true);
    return editor.dom.getParent(selectionStart, 'OL,UL,DL', getClosestListRootElm(editor, selectionStart));
};
exports.getParentList = getParentList;
const isParentListSelected = function (parentList, selectedBlocks) {
    return parentList && selectedBlocks.length === 1 && selectedBlocks[0] === parentList;
};
const findSubLists = function (parentList) {
    return Tools_1.default.grep(parentList.querySelectorAll('ol,ul,dl'), function (elm) {
        return NodeType.isListNode(elm);
    });
};
const getSelectedSubLists = function (editor) {
    const parentList = getParentList(editor);
    const selectedBlocks = editor.selection.getSelectedBlocks();
    if (isParentListSelected(parentList, selectedBlocks)) {
        return findSubLists(parentList);
    }
    else {
        return Tools_1.default.grep(selectedBlocks, function (elm) {
            return NodeType.isListNode(elm) && parentList !== elm;
        });
    }
};
exports.getSelectedSubLists = getSelectedSubLists;
const findParentListItemsNodes = function (editor, elms) {
    const listItemsElms = Tools_1.default.map(elms, function (elm) {
        const parentLi = editor.dom.getParent(elm, 'li,dd,dt', getClosestListRootElm(editor, elm));
        return parentLi ? parentLi : elm;
    });
    return DomQuery_1.default.unique(listItemsElms);
};
const getSelectedListItems = function (editor) {
    const selectedBlocks = editor.selection.getSelectedBlocks();
    return Tools_1.default.grep(findParentListItemsNodes(editor, selectedBlocks), function (block) {
        return NodeType.isListItemNode(block);
    });
};
exports.getSelectedListItems = getSelectedListItems;
const getSelectedDlItems = (editor) => {
    return katamari_1.Arr.filter(getSelectedListItems(editor), NodeType.isDlItemNode);
};
exports.getSelectedDlItems = getSelectedDlItems;
const getClosestListRootElm = function (editor, elm) {
    const parentTableCell = editor.dom.getParents(elm, 'TD,TH');
    const root = parentTableCell.length > 0 ? parentTableCell[0] : editor.getBody();
    return root;
};
exports.getClosestListRootElm = getClosestListRootElm;
const findLastParentListNode = (editor, elm) => {
    const parentLists = editor.dom.getParents(elm, 'ol,ul', getClosestListRootElm(editor, elm));
    return katamari_1.Arr.last(parentLists);
};
const getSelectedLists = (editor) => {
    const firstList = findLastParentListNode(editor, editor.selection.getStart());
    const subsequentLists = katamari_1.Arr.filter(editor.selection.getSelectedBlocks(), NodeType.isOlUlNode);
    return firstList.toArray().concat(subsequentLists);
};
const getSelectedListRoots = (editor) => {
    const selectedLists = getSelectedLists(editor);
    return getUniqueListRoots(editor, selectedLists);
};
exports.getSelectedListRoots = getSelectedListRoots;
const getUniqueListRoots = (editor, lists) => {
    const listRoots = katamari_1.Arr.map(lists, (list) => findLastParentListNode(editor, list).getOr(list));
    return DomQuery_1.default.unique(listRoots);
};
const isList = (editor) => {
    const list = getParentList(editor);
    return sand_1.HTMLElement.isPrototypeOf(list);
};
exports.isList = isList;
//# sourceMappingURL=Selection.js.map