/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Document } from '@ephox/dom-globals';
import { Arr, Option, Options } from '@ephox/katamari';
import { Attr, Css, Element, Insert, InsertAll, Node, Replication } from '@ephox/sugar';
import { Entry } from './Entry';
import { ListType } from './Util';

interface Segment {
  list: Element;
  item: Element;
}

const joinSegment = (parent: Segment, child: Segment): void => {
  Insert.append(parent.item, child.list);
};

const joinSegments = (segments: Segment[]): void => {
  for (let i = 1; i < segments.length; i++) {
    joinSegment(segments[i - 1], segments[i]);
  }
};

const appendSegments = (head: Segment[], tail: Segment[]): void => {
  Options.lift2(Arr.last(head), Arr.head(tail), joinSegment);
};

const createSegment = (scope: Document, listType: ListType): Segment => {
  const segment: Segment = {
    list: Element.fromTag(listType, scope),
    item: Element.fromTag('li', scope)
  };
  Insert.append(segment.list, segment.item);
  return segment;
};

const createSegments = (scope: Document, entry: Entry, size: number): Segment[] => {
  const segments: Segment[] = [];
  for (let i = 0; i < size; i++) {
    segments.push(createSegment(scope, entry.listType));
  }
  return segments;
};

const populateSegments = (segments: Segment[], entry: Entry): void => {
  for (let i = 0; i < segments.length - 1; i++) {
    Css.set(segments[i].item, 'list-style-type', 'none');
  }
  Arr.last(segments).each((segment) => {
    Attr.setAll(segment.list, entry.listAttributes);
    Attr.setAll(segment.item, entry.itemAttributes);
    InsertAll.append(segment.item, entry.content);
  });
};

const normalizeSegment = (segment: Segment, entry: Entry): void => {
  if (Node.name(segment.list) !== entry.listType) {
    segment.list = Replication.mutate(segment.list, entry.listType);
  }
  Attr.setAll(segment.list, entry.listAttributes);
};

const createItem = (scope: Document, attr: Record<string, any>, content: Element[]): Element => {
  const item = Element.fromTag('li', scope);
  Attr.setAll(item, attr);
  InsertAll.append(item, content);
  return item;
};

const appendItem = (segment: Segment, item: Element): void => {
  Insert.append(segment.list, item);
  segment.item = item;
};

const writeShallow = (scope: Document, cast: Segment[], entry: Entry): Segment[] => {
  const newCast = cast.slice(0, entry.depth);

  Arr.last(newCast).each((segment) => {
    const item = createItem(scope, entry.itemAttributes, entry.content);
    appendItem(segment, item);
    normalizeSegment(segment, entry);
  });

  return newCast;
};

const writeDeep = (scope: Document, cast: Segment[], entry: Entry): Segment[] => {
  const segments = createSegments(scope, entry, entry.depth - cast.length);
  joinSegments(segments);
  populateSegments(segments, entry);
  appendSegments(cast, segments);

  return cast.concat(segments);
};

const composeList = (scope: Document, entries: Entry[]): Option<Element> => {
  const cast: Segment[] = Arr.foldl(entries, (cast, entry) => {
    return entry.depth > cast.length ? writeDeep(scope, cast, entry) : writeShallow(scope, cast, entry);
  }, []);

  return Arr.head(cast).map((segment) => segment.list);
};

export { composeList };
