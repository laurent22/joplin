/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import BookmarkManager from 'tinymce/core/api/dom/BookmarkManager';
import Tools from 'tinymce/core/api/util/Tools';
import * as Bookmark from '../core/Bookmark';
import * as NodeType from '../core/NodeType';
import * as Selection from '../core/Selection';
import { HTMLElement } from '@ephox/dom-globals';
import { flattenListSelection } from './Indendation';
import { fireListEvent } from '../api/Events';
import { isCustomList } from '../core/Util';
import Editor from 'tinymce/core/api/Editor';
import { listToggleActionFromListName } from '../core/ListAction';
import { findContainerListTypeFromElement } from '../listModel/JoplinListUtil';

const updateListStyle = function (dom, el, detail) {
  const type = detail['list-style-type'] ? detail['list-style-type'] : null;
  dom.setStyle(el, 'list-style-type', type);
};

const setAttribs = function (elm, attrs) {
  Tools.each(attrs, function (value, key) {
    elm.setAttribute(key, value);
  });
};

const updateListAttrs = function (dom, el, detail) {
  setAttribs(el, detail['list-attributes']);
  Tools.each(dom.select('li', el), function (li) {
    setAttribs(li, detail['list-item-attributes']);
  });
};

const updateListWithDetails = function (dom, el, detail) {
  updateListStyle(dom, el, detail);
  updateListAttrs(dom, el, detail);

  if (detail.listType === 'joplinChecklist') {
    el.classList.add('joplin-checklist');
  } else {
    el.classList.remove('joplin-checklist');
  }
};

const removeStyles = (dom, element: HTMLElement, styles: string[]) => {
  Tools.each(styles, (style) => dom.setStyle(element, { [style]: '' }));
};

const getEndPointNode = function (editor, rng, start, root) {
  let container, offset;

  container = rng[start ? 'startContainer' : 'endContainer'];
  offset = rng[start ? 'startOffset' : 'endOffset'];

  // Resolve node index
  if (container.nodeType === 1) {
    container = container.childNodes[Math.min(offset, container.childNodes.length - 1)] || container;
  }

  if (!start && NodeType.isBr(container.nextSibling)) {
    container = container.nextSibling;
  }

  while (container.parentNode !== root) {
    if (NodeType.isTextBlock(editor, container)) {
      return container;
    }

    if (/^(TD|TH)$/.test(container.parentNode.nodeName)) {
      return container;
    }

    container = container.parentNode;
  }

  return container;
};

const getSelectedTextBlocks = function (editor, rng, root) {
  const textBlocks = [], dom = editor.dom;

  const startNode = getEndPointNode(editor, rng, true, root);
  const endNode = getEndPointNode(editor, rng, false, root);
  let block;
  const siblings = [];

  for (let node = startNode; node; node = node.nextSibling) {
    siblings.push(node);

    if (node === endNode) {
      break;
    }
  }

  Tools.each(siblings, function (node) {
    if (NodeType.isTextBlock(editor, node)) {
      textBlocks.push(node);
      block = null;
      return;
    }

    if (dom.isBlock(node) || NodeType.isBr(node)) {
      if (NodeType.isBr(node)) {
        dom.remove(node);
      }

      block = null;
      return;
    }

    const nextSibling = node.nextSibling;
    if (BookmarkManager.isBookmarkNode(node)) {
      if (NodeType.isTextBlock(editor, nextSibling) || (!nextSibling && node.parentNode === root)) {
        block = null;
        return;
      }
    }

    if (!block) {
      block = dom.create('p');
      node.parentNode.insertBefore(block, node);
      textBlocks.push(block);
    }

    block.appendChild(node);
  });

  return textBlocks;
};

const hasCompatibleStyle = function (dom, sib, detail) {
  const sibStyle = dom.getStyle(sib, 'list-style-type');
  let detailStyle = detail ? detail['list-style-type'] : '';

  detailStyle = detailStyle === null ? '' : detailStyle;

  return sibStyle === detailStyle;
};

const applyList = function (editor, listName: string, detail:any = {}) {
  const rng = editor.selection.getRng(true);
  let bookmark;
  let listItemName = 'LI';
  const root = Selection.getClosestListRootElm(editor, editor.selection.getStart(true));
  const dom = editor.dom;

  if (dom.getContentEditable(editor.selection.getNode()) === 'false') {
    return;
  }

  listName = listName.toUpperCase();

  if (listName === 'DL') {
    listItemName = 'DT';
  }

  bookmark = Bookmark.createBookmark(rng);

  Tools.each(getSelectedTextBlocks(editor, rng, root), function (block) {
    let listBlock, sibling;

    sibling = block.previousSibling;
    if (sibling && NodeType.isListNode(sibling) && sibling.nodeName === listName && hasCompatibleStyle(dom, sibling, detail)) {
      listBlock = sibling;
      block = dom.rename(block, listItemName);
      sibling.appendChild(block);
    } else {
      listBlock = dom.create(listName);
      if (detail.listType === 'joplinChecklist') {
        listBlock.classList.add('joplin-checklist');
      } else {
        listBlock.classList.remove('joplin-checklist');
      }
      block.parentNode.insertBefore(listBlock, block);
      listBlock.appendChild(block);
      block = dom.rename(block, listItemName);
    }

    removeStyles(dom, block, [
      'margin', 'margin-right', 'margin-bottom', 'margin-left', 'margin-top',
      'padding', 'padding-right', 'padding-bottom', 'padding-left', 'padding-top',
    ]);

    updateListWithDetails(dom, listBlock, detail);
    mergeWithAdjacentLists(editor.dom, listBlock);
  });

  editor.selection.setRng(Bookmark.resolveBookmark(bookmark));
};

const isValidLists = function (list1, list2) {
  return list1 && list2 && NodeType.isListNode(list1) && list1.nodeName === list2.nodeName;
};

const hasSameListStyle = function (dom, list1, list2) {
  const targetStyle = dom.getStyle(list1, 'list-style-type', true);
  const style = dom.getStyle(list2, 'list-style-type', true);
  return targetStyle === style;
};

const hasSameClasses = function (elm1, elm2) {
  return elm1.className === elm2.className;
};

const shouldMerge = function (dom, list1, list2) {
  return isValidLists(list1, list2) && hasSameListStyle(dom, list1, list2) && hasSameClasses(list1, list2);
};

const mergeWithAdjacentLists = function (dom, listBlock) {
  let sibling, node;

  sibling = listBlock.nextSibling;
  if (shouldMerge(dom, listBlock, sibling)) {
    while ((node = sibling.firstChild)) {
      listBlock.appendChild(node);
    }

    dom.remove(sibling);
  }

  sibling = listBlock.previousSibling;
  if (shouldMerge(dom, listBlock, sibling)) {
    while ((node = sibling.lastChild)) {
      listBlock.insertBefore(node, listBlock.firstChild);
    }

    dom.remove(sibling);
  }
};

const updateList = function (editor: Editor, list, listName, detail) {
  if (list.nodeName !== listName) {
    const newList = editor.dom.rename(list, listName);
    updateListWithDetails(editor.dom, newList, detail);
    fireListEvent(editor, listToggleActionFromListName(listName), newList);
  } else {
    updateListWithDetails(editor.dom, list, detail);
    fireListEvent(editor, listToggleActionFromListName(listName), list);
  }
};

const toggleMultipleLists = function (editor, parentList, lists, listName, detail) {
  if (parentList.nodeName === listName && !hasListStyleDetail(detail)) {
    flattenListSelection(editor);
  } else {
    const bookmark = Bookmark.createBookmark(editor.selection.getRng(true));

    Tools.each([parentList].concat(lists), function (elm) {
      updateList(editor, elm, listName, detail);
    });

    editor.selection.setRng(Bookmark.resolveBookmark(bookmark));
  }
};

const hasListStyleDetail = function (detail) {
  return 'list-style-type' in detail;
};

const toggleSingleList =  function (editor, parentList, listName, detail) {
  if (parentList === editor.getBody()) {
    return;
  }

  if (parentList) {
    const listType = findContainerListTypeFromElement(parentList);
    if (parentList.nodeName === listName && !hasListStyleDetail(detail) && !isCustomList(parentList) && listType === detail.listType) {
      flattenListSelection(editor);
    } else {
      const bookmark = Bookmark.createBookmark(editor.selection.getRng(true));
      updateListWithDetails(editor.dom, parentList, detail);
      const newList = editor.dom.rename(parentList, listName);
      mergeWithAdjacentLists(editor.dom, newList);
      editor.selection.setRng(Bookmark.resolveBookmark(bookmark));
      fireListEvent(editor, listToggleActionFromListName(listName), newList);
    }
  } else {
    applyList(editor, listName, detail);
    fireListEvent(editor, listToggleActionFromListName(listName), parentList);
  }
};

const toggleList = function (editor, listName, detail) {
  const parentList = Selection.getParentList(editor);
  const selectedSubLists = Selection.getSelectedSubLists(editor);

  detail = {
    listType: 'regular',
    ...detail,
  }

  if (parentList && selectedSubLists.length > 0) {
    toggleMultipleLists(editor, parentList, selectedSubLists, listName, detail);
  } else {
    toggleSingleList(editor, parentList, listName, detail);
  }
};

export {
  toggleList,
  mergeWithAdjacentLists
};
