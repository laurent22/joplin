/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Element, Traverse, Replication, Attr, Node } from '@ephox/sugar';
import { Arr, Option } from '@ephox/katamari';
import { hasLastChildList, ListType } from './Util';

/*
General workflow: Parse lists to entries -> Manipulate entries -> Compose entries to lists

0-------1---2--------->Depth
  <ol>                |
    <li>a</li>        | Entry { depth: 1, content: [a], listType: ListType.OL, ... }
    <li>b             | Entry { depth: 1, content: [b], listType: ListType.OL, ... }
      <ul>            |
        <li>c</li>    | Entry { depth: 2, content: [c], listType: ListType.UL, ... }
      </ul>           |
    </li>             |
  </ol>               |
0-------1---2--------->Depth
*/

export interface Entry {
  depth: number;
  content: Element[];
  isSelected: boolean;
  listType: ListType;
  listAttributes: Record<string, any>;
  itemAttributes: Record<string, any>;
}

const isIndented = (entry: Entry) => {
  return entry.depth > 0;
};

const isSelected = (entry: Entry) => {
  return entry.isSelected;
};

const cloneItemContent = (li: Element): Element[] => {
  const children = Traverse.children(li);
  const content = hasLastChildList(li) ? children.slice(0, -1) : children;
  return Arr.map(content, Replication.deep);
};

const createEntry = (li: Element, depth: number, isSelected: boolean): Option<Entry> => {
  return Traverse.parent(li).filter(Node.isElement).map((list) => {
    return {
      depth,
      isSelected,
      content: cloneItemContent(li),
      itemAttributes: Attr.clone(li),
      listAttributes: Attr.clone(list),
      listType: Node.name(list) as ListType
    };
  });
};

export {
  createEntry,
  isIndented,
  isSelected
};