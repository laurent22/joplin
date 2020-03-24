/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import Editor from 'tinymce/core/api/Editor';
import { Compare, Replication, Element, Traverse } from '@ephox/sugar';
import * as SplitList from './SplitList';
import { Indentation } from '../listModel/Indentation';
import { Arr } from '@ephox/katamari';

const outdentDlItem = (editor: Editor, item: Element): void => {
  if (Compare.is(item, 'dd')) {
    Replication.mutate(item, 'dt');
  } else if (Compare.is(item, 'dt')) {
    Traverse.parent(item).each((dl) => SplitList.splitList(editor, dl.dom(), item.dom()));
  }
};

const indentDlItem = (item: Element): void => {
  if (Compare.is(item, 'dt')) {
    Replication.mutate(item, 'dd');
  }
};

const dlIndentation = (editor: Editor, indentation: Indentation, dlItems: Element[]) => {
  if (indentation === Indentation.Indent) {
    Arr.each(dlItems, indentDlItem);
  } else {
    Arr.each(dlItems, (item) => outdentDlItem(editor, item));
  }
};

export {
  dlIndentation
};
