"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markKeyword = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const isInsideContainer = (node, tagName) => {
    if (!node)
        return false;
    const targetTagName = tagName.toLowerCase();
    let currentNode = node;
    while (currentNode) {
        if (currentNode.tagName && currentNode.tagName.toLowerCase() === targetTagName)
            return true;
        currentNode = currentNode.parentNode;
    }
    return false;
};
const markKeyword = (mark, keyword, _stringUtils, extraOptions = null) => {
    let normalizedKeyword;
    if (typeof keyword === 'string') {
        normalizedKeyword = {
            type: 'text',
            value: keyword,
        };
    }
    else {
        normalizedKeyword = keyword;
    }
    const isBasicSearch = ['ja', 'zh', 'ko'].indexOf(normalizedKeyword.scriptType || '') >= 0;
    let value = normalizedKeyword.value;
    const getAccuracy = (kw) => {
        if (isBasicSearch)
            return 'partially';
        if (kw.type === 'regex')
            return 'complementary';
        if (kw.accuracy)
            return kw.accuracy;
        return kw.value.length >= 2 ? 'partially' : { value: 'exactly', limiters: ':;.,-–—‒_(){}[]!\'"+='.split('') };
    };
    const accuracy = getAccuracy(normalizedKeyword);
    if (normalizedKeyword.type === 'regex') {
        // Remove the trailing wildcard and "accuracy = complementary" will take
        // care of highlighting the relevant keywords.
        // Known bug: it will also highlight word that contain the term as a
        // suffix for example for "ent*", it will highlight "present" which is
        // incorrect (it should only highlight what starts with "ent") but for
        // now will do. Mark.js doesn't have an option to tweak this behaviour.
        value = normalizedKeyword.value.substr(0, normalizedKeyword.value.length - 1);
    }
    mark.mark([value], Object.assign({ accuracy: accuracy, filter: (node) => {
            var _a;
            // We exclude SVG because it creates a "<mark>" tag inside
            // the document, which is not a valid SVG tag. As a result
            // the content within that tag disappears.
            //
            // mark.js has an "exclude" parameter, but it doesn't work
            // so we use "filter" instead.
            //
            // https://github.com/joplin/plugin-abc-sheet-music
            if (isInsideContainer(node, 'SVG'))
                return false;
            // We exclude joplin-source because it contains the raw source
            // for editable blocks (mermaid diagrams, etc.). If we highlight
            // inside these elements, the <mark> tags corrupt the source code
            // and cause rendering to fail when switching editors.
            //
            // https://github.com/laurent22/joplin/issues/14142
            if ((_a = node.parentElement) === null || _a === void 0 ? void 0 : _a.closest('.joplin-source'))
                return false;
            return true;
        } }, extraOptions));
};
exports.markKeyword = markKeyword;
const markJsUtils = {
    markKeyword: exports.markKeyword,
};
exports.default = markJsUtils;
//# sourceMappingURL=markJsUtils.js.map