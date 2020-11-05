/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import * as NodeType from './NodeType';
import { DocumentFragment, Node } from '@ephox/dom-globals';
import Editor from 'tinymce/core/api/Editor';
import * as Settings from '../api/Settings';

const createTextBlock = (editor: Editor, contentNode: Node): DocumentFragment => {
  const dom = editor.dom;
  const blockElements = editor.schema.getBlockElements();
  const fragment = dom.createFragment();
  const blockName = Settings.getForcedRootBlock(editor);
  let node, textBlock, hasContentNode;

  if (blockName) {
    textBlock = dom.create(blockName);

    if (textBlock.tagName === blockName.toUpperCase()) {
      dom.setAttribs(textBlock, Settings.getForcedRootBlockAttrs(editor));
    }

    if (!NodeType.isBlock(contentNode.firstChild, blockElements)) {
      fragment.appendChild(textBlock);
    }
  }

  if (contentNode) {
    while ((node = contentNode.firstChild)) {
      const nodeName = node.nodeName;

      if (!hasContentNode && (nodeName !== 'SPAN' || node.getAttribute('data-mce-type') !== 'bookmark')) {
        hasContentNode = true;
      }

      if (NodeType.isBlock(node, blockElements)) {
        fragment.appendChild(node);
        textBlock = null;
      } else {
        if (blockName) {
          if (!textBlock) {
            textBlock = dom.create(blockName);
            fragment.appendChild(textBlock);
          }

          textBlock.appendChild(node);
        } else {
          fragment.appendChild(node);
        }
      }
    }
  }

  if (!blockName) {
    fragment.appendChild(dom.create('br'));
  } else {
    // BR is needed in empty blocks
    if (!hasContentNode) {
      textBlock.appendChild(dom.create('br', { 'data-mce-bogus': '1' }));
    }
  }

  return fragment;
};

export {
  createTextBlock
};
