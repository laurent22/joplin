/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Element, Traverse, Compare } from '@ephox/sugar';

export const enum ListType {
  OL = 'ol',
  UL = 'ul'
}

const isList = (el: Element) => {
  return Compare.is(el, 'OL,UL');
};

const hasFirstChildList = (el: Element) => {
  return Traverse.firstChild(el).map(isList).getOr(false);
};

const hasLastChildList = (el: Element) => {
  return Traverse.lastChild(el).map(isList).getOr(false);
};

export {
  isList,
  hasFirstChildList,
  hasLastChildList
};