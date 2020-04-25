/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import Editor from 'tinymce/core/api/Editor';

const shouldIndentOnTab = function (editor: Editor) {
  return editor.getParam('lists_indent_on_tab', true);
};

const getForcedRootBlock = (editor: Editor): string => {
  const block = editor.getParam('forced_root_block', 'p');
  if (block === false) {
    return '';
  } else if (block === true) {
    return 'p';
  } else {
    return block;
  }
};

const getForcedRootBlockAttrs = (editor: Editor): Record<string, string> => {
  return editor.getParam('forced_root_block_attrs', {});
};

export {
  shouldIndentOnTab,
  getForcedRootBlock,
  getForcedRootBlockAttrs
};
