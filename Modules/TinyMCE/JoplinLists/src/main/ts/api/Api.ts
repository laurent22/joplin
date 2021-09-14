/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import * as Delete from '../core/Delete';
import Editor from 'tinymce/core/api/Editor';

const get = function (editor: Editor) {
  return {
    backspaceDelete (isForward: boolean) {
      Delete.backspaceDelete(editor, isForward);
    }
  };
};

export {
  get
};
