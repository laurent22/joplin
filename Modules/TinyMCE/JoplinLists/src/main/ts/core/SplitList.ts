/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import DOMUtils from 'tinymce/core/api/dom/DOMUtils';
import * as NodeType from './NodeType';
import { createTextBlock } from './TextBlock';
import Tools from 'tinymce/core/api/util/Tools';

const DOM = DOMUtils.DOM;

const splitList = function (editor, ul, li) {
  let tmpRng, fragment, bookmarks, node, newBlock;

  const removeAndKeepBookmarks = function (targetNode) {
    Tools.each(bookmarks, function (node) {
      targetNode.parentNode.insertBefore(node, li.parentNode);
    });

    DOM.remove(targetNode);
  };

  bookmarks = DOM.select('span[data-mce-type="bookmark"]', ul);
  newBlock = createTextBlock(editor, li);
  tmpRng = DOM.createRng();
  tmpRng.setStartAfter(li);
  tmpRng.setEndAfter(ul);
  fragment = tmpRng.extractContents();

  for (node = fragment.firstChild; node; node = node.firstChild) {
    if (node.nodeName === 'LI' && editor.dom.isEmpty(node)) {
      DOM.remove(node);
      break;
    }
  }

  if (!editor.dom.isEmpty(fragment)) {
    DOM.insertAfter(fragment, ul);
  }

  DOM.insertAfter(newBlock, ul);

  if (NodeType.isEmpty(editor.dom, li.parentNode)) {
    removeAndKeepBookmarks(li.parentNode);
  }

  DOM.remove(li);

  if (NodeType.isEmpty(editor.dom, ul)) {
    DOM.remove(ul);
  }
};

export {
  splitList
};
