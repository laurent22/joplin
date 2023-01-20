"use strict";
/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalizationFunction = exports.getForcedRootBlockAttrs = exports.getForcedRootBlock = exports.shouldIndentOnTab = void 0;
const shouldIndentOnTab = function (editor) {
    return editor.getParam('lists_indent_on_tab', true);
};
exports.shouldIndentOnTab = shouldIndentOnTab;
const getForcedRootBlock = (editor) => {
    const block = editor.getParam('forced_root_block', 'p');
    if (block === false) {
        return '';
    }
    else if (block === true) {
        return 'p';
    }
    else {
        return block;
    }
};
exports.getForcedRootBlock = getForcedRootBlock;
const getForcedRootBlockAttrs = (editor) => {
    return editor.getParam('forced_root_block_attrs', {});
};
exports.getForcedRootBlockAttrs = getForcedRootBlockAttrs;
const getLocalizationFunction = (editor) => {
    return editor.getParam('localization_function', (s) => s);
};
exports.getLocalizationFunction = getLocalizationFunction;
//# sourceMappingURL=Settings.js.map