"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeList = void 0;
const katamari_1 = require("@ephox/katamari");
const sugar_1 = require("@ephox/sugar");
const joinSegment = (parent, child) => {
    sugar_1.Insert.append(parent.item, child.list);
};
const joinSegments = (segments) => {
    for (let i = 1; i < segments.length; i++) {
        joinSegment(segments[i - 1], segments[i]);
    }
};
const appendSegments = (head, tail) => {
    katamari_1.Options.lift2(katamari_1.Arr.last(head), katamari_1.Arr.head(tail), joinSegment);
};
const createSegment = (scope, listType) => {
    const segment = {
        list: sugar_1.Element.fromTag(listType, scope),
        item: sugar_1.Element.fromTag('li', scope)
    };
    sugar_1.Insert.append(segment.list, segment.item);
    return segment;
};
const createSegments = (scope, entry, size) => {
    const segments = [];
    for (let i = 0; i < size; i++) {
        segments.push(createSegment(scope, entry.listType));
    }
    return segments;
};
const populateSegments = (segments, entry) => {
    for (let i = 0; i < segments.length - 1; i++) {
        sugar_1.Css.set(segments[i].item, 'list-style-type', 'none');
    }
    katamari_1.Arr.last(segments).each((segment) => {
        sugar_1.Attr.setAll(segment.list, entry.listAttributes);
        sugar_1.Attr.setAll(segment.item, entry.itemAttributes);
        sugar_1.InsertAll.append(segment.item, entry.content);
    });
};
const normalizeSegment = (segment, entry) => {
    if (sugar_1.Node.name(segment.list) !== entry.listType) {
        segment.list = sugar_1.Replication.mutate(segment.list, entry.listType);
    }
    sugar_1.Attr.setAll(segment.list, entry.listAttributes);
};
const createItem = (scope, attr, content) => {
    const item = sugar_1.Element.fromTag('li', scope);
    sugar_1.Attr.setAll(item, attr);
    sugar_1.InsertAll.append(item, content);
    return item;
};
const appendItem = (segment, item) => {
    sugar_1.Insert.append(segment.list, item);
    segment.item = item;
};
const writeShallow = (scope, cast, entry) => {
    const newCast = cast.slice(0, entry.depth);
    katamari_1.Arr.last(newCast).each((segment) => {
        const item = createItem(scope, entry.itemAttributes, entry.content);
        appendItem(segment, item);
        normalizeSegment(segment, entry);
    });
    return newCast;
};
const writeDeep = (scope, cast, entry) => {
    const segments = createSegments(scope, entry, entry.depth - cast.length);
    joinSegments(segments);
    populateSegments(segments, entry);
    appendSegments(cast, segments);
    return cast.concat(segments);
};
const composeList = (scope, entries) => {
    const cast = katamari_1.Arr.foldl(entries, (cast, entry) => {
        return entry.depth > cast.length ? writeDeep(scope, cast, entry) : writeShallow(scope, cast, entry);
    }, []);
    return katamari_1.Arr.head(cast).map((segment) => segment.list);
};
exports.composeList = composeList;
//# sourceMappingURL=ComposeList.js.map