"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const ToggleList = require("../actions/ToggleList");
const Indendation_1 = require("../actions/Indendation");
const JoplinListUtil_1 = require("../listModel/JoplinListUtil");
const queryListCommandState = function (editor, listName) {
    return function () {
        const parentList = editor.dom.getParent(editor.selection.getStart(), 'UL,OL,DL');
        return parentList && parentList.nodeName === listName;
    };
};
const register = function (editor) {
    editor.on('BeforeExecCommand', function (e) {
        const cmd = e.command.toLowerCase();
        if (cmd === 'indent') {
            (0, Indendation_1.indentListSelection)(editor);
        }
        else if (cmd === 'outdent') {
            (0, Indendation_1.outdentListSelection)(editor);
        }
    });
    editor.addCommand('InsertUnorderedList', function (ui, detail) {
        ToggleList.toggleList(editor, 'UL', detail);
    });
    editor.addCommand('InsertOrderedList', function (ui, detail) {
        ToggleList.toggleList(editor, 'OL', detail);
    });
    editor.addCommand('InsertDefinitionList', function (ui, detail) {
        ToggleList.toggleList(editor, 'DL', detail);
    });
    editor.addCommand('RemoveList', () => {
        (0, Indendation_1.flattenListSelection)(editor);
    });
    editor.addQueryStateHandler('InsertUnorderedList', queryListCommandState(editor, 'UL'));
    editor.addQueryStateHandler('InsertOrderedList', queryListCommandState(editor, 'OL'));
    editor.addQueryStateHandler('InsertDefinitionList', queryListCommandState(editor, 'DL'));
    (0, JoplinListUtil_1.addJoplinChecklistCommands)(editor, ToggleList);
};
exports.register = register;
//# sourceMappingURL=Commands.js.map