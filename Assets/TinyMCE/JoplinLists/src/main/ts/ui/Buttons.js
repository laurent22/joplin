"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const Tools_1 = require("tinymce/core/api/util/Tools");
const Settings = require("../api/Settings");
const NodeType = require("../core/NodeType");
const Util_1 = require("../core/Util");
const JoplinListUtil_1 = require("../listModel/JoplinListUtil");
const findIndex = function (list, predicate) {
    for (let index = 0; index < list.length; index++) {
        const element = list[index];
        if (predicate(element)) {
            return index;
        }
    }
    return -1;
};
const listState = function (editor, listName, options = {}) {
    options = Object.assign({ listType: 'regular' }, options);
    return function (buttonApi) {
        const nodeChangeHandler = (e) => {
            const tableCellIndex = findIndex(e.parents, NodeType.isTableCellNode);
            const parents = tableCellIndex !== -1 ? e.parents.slice(0, tableCellIndex) : e.parents;
            const lists = Tools_1.default.grep(parents, NodeType.isListNode);
            const listType = (0, JoplinListUtil_1.findContainerListTypeFromEvent)(e);
            buttonApi.setActive(listType === options.listType && lists.length > 0 && lists[0].nodeName === listName && !(0, Util_1.isCustomList)(lists[0]));
        };
        editor.on('NodeChange', nodeChangeHandler);
        return () => {
            editor.off('NodeChange', nodeChangeHandler);
        };
    };
};
const register = function (editor) {
    const hasPlugin = function (editor, plugin) {
        const plugins = editor.settings.plugins ? editor.settings.plugins : '';
        return Tools_1.default.inArray(plugins.split(/[ ,]/), plugin) !== -1;
    };
    const _ = Settings.getLocalizationFunction(editor);
    const exec = (command) => () => editor.execCommand(command);
    if (!hasPlugin(editor, 'advlist')) {
        editor.ui.registry.addToggleButton('numlist', {
            icon: 'ordered-list',
            active: false,
            tooltip: 'Numbered list',
            onAction: exec('InsertOrderedList'),
            onSetup: listState(editor, 'OL')
        });
        editor.ui.registry.addToggleButton('bullist', {
            icon: 'unordered-list',
            active: false,
            tooltip: 'Bullet list',
            onAction: exec('InsertUnorderedList'),
            onSetup: listState(editor, 'UL')
        });
        editor.ui.registry.addToggleButton('joplinChecklist', {
            icon: 'checklist',
            active: false,
            tooltip: _('Checkbox list'),
            onAction: exec('InsertJoplinChecklist'),
            onSetup: listState(editor, 'UL', { listType: 'joplinChecklist' })
        });
    }
};
exports.register = register;
//# sourceMappingURL=Buttons.js.map