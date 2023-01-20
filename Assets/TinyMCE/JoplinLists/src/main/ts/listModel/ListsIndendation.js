"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIndentation = void 0;
const katamari_1 = require("@ephox/katamari");
const sugar_1 = require("@ephox/sugar");
const Events_1 = require("../api/Events");
const Selection = require("../core/Selection");
const TextBlock_1 = require("../core/TextBlock");
const ComposeList_1 = require("./ComposeList");
const Entry_1 = require("./Entry");
const Indentation_1 = require("./Indentation");
const NormalizeEntries_1 = require("./NormalizeEntries");
const ParseLists_1 = require("./ParseLists");
const Util_1 = require("./Util");
const outdentedComposer = (editor, entries) => {
    return katamari_1.Arr.map(entries, (entry) => {
        const content = sugar_1.Fragment.fromElements(entry.content);
        return sugar_1.Element.fromDom((0, TextBlock_1.createTextBlock)(editor, content.dom()));
    });
};
const indentedComposer = (editor, entries) => {
    (0, NormalizeEntries_1.normalizeEntries)(entries);
    return (0, ComposeList_1.composeList)(editor.contentDocument, entries).toArray();
};
const composeEntries = (editor, entries) => {
    return katamari_1.Arr.bind(katamari_1.Arr.groupBy(entries, Entry_1.isIndented), (entries) => {
        const groupIsIndented = katamari_1.Arr.head(entries).map(Entry_1.isIndented).getOr(false);
        return groupIsIndented ? indentedComposer(editor, entries) : outdentedComposer(editor, entries);
    });
};
const indentSelectedEntries = (entries, indentation) => {
    katamari_1.Arr.each(katamari_1.Arr.filter(entries, Entry_1.isSelected), (entry) => (0, Indentation_1.indentEntry)(indentation, entry));
};
const getItemSelection = (editor) => {
    const selectedListItems = katamari_1.Arr.map(Selection.getSelectedListItems(editor), sugar_1.Element.fromDom);
    return katamari_1.Options.lift2(katamari_1.Arr.find(selectedListItems, katamari_1.Fun.not(Util_1.hasFirstChildList)), katamari_1.Arr.find(katamari_1.Arr.reverse(selectedListItems), katamari_1.Fun.not(Util_1.hasFirstChildList)), (start, end) => ({ start, end }));
};
const listIndentation = (editor, lists, indentation) => {
    const entrySets = (0, ParseLists_1.parseLists)(lists, getItemSelection(editor));
    katamari_1.Arr.each(entrySets, (entrySet) => {
        indentSelectedEntries(entrySet.entries, indentation);
        const composedLists = composeEntries(editor, entrySet.entries);
        katamari_1.Arr.each(composedLists, (composedList) => {
            (0, Events_1.fireListEvent)(editor, indentation === "Indent" /* Indentation.Indent */ ? "IndentList" /* ListAction.IndentList */ : "OutdentList" /* ListAction.OutdentList */, composedList.dom());
        });
        sugar_1.InsertAll.before(entrySet.sourceList, composedLists);
        sugar_1.Remove.remove(entrySet.sourceList);
    });
};
exports.listIndentation = listIndentation;
//# sourceMappingURL=ListsIndendation.js.map