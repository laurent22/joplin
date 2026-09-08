"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uslug_1 = __importDefault(require("@joplin/fork-uslug/lib/uslug"));
const htmlNodeInfo_1 = __importDefault(require("./htmlNodeInfo"));
const language_1 = require("@codemirror/language");
// Searches the given `state` for a line that matches the target link.
const findPositionMatchingLink = (link, state) => {
    const isAnchorLink = link.startsWith('#');
    const isFootnote = link.startsWith('[^') && link.endsWith(']');
    if (!isAnchorLink && !isFootnote)
        return null;
    if (isFootnote) {
        return findPositionMatchingFootnote(link, state);
    }
    else if (isAnchorLink) {
        return findPositionMatchingHash(link.substring(1), state);
    }
    return null;
};
const findPositionMatchingFootnote = (footnoteMarker, state) => {
    let iterator = state.doc.iterLines();
    let lineNumber = 0;
    while (!iterator.done && lineNumber <= state.doc.lines) {
        lineNumber++;
        iterator = iterator.next();
        const line = iterator.value;
        if (line.trim().startsWith(`${footnoteMarker}:`)) {
            return state.doc.line(lineNumber).to;
        }
    }
    return null;
};
const findPositionMatchingHash = (hash, state) => {
    var _a;
    let targetLocation = null;
    const makeEnterNode = (offset) => (node) => {
        var _a, _b;
        const nodeToText = (node) => {
            return state.sliceDoc(node.from + offset, node.to + offset);
        };
        const found = targetLocation !== null;
        if (found)
            return false; // Skip this node
        let matches = false;
        if (node.name.startsWith('SetextHeading') || node.name.startsWith('ATXHeading')) {
            const nodeText = nodeToText(node)
                .replace(/^#+\s/, '') // Leading #s in headers
                .replace(/\n-+$/, ''); // Trailing --s in headers
            matches = hash === (0, uslug_1.default)(nodeText);
        }
        else if (node.name === 'HTMLBlock') {
            // CodeMirror adds HTML information to Markdown documents using overlays attached
            // to HTMLTag and HTMLBlock nodes.
            // Use .enter to enter the overlay and visit the HTML nodes:
            (_b = (_a = node.node.enter(node.from, 1)) === null || _a === void 0 ? void 0 : _a.toTree()) === null || _b === void 0 ? void 0 : _b.iterate({ enter: makeEnterNode(node.from) });
        }
        else if (node.name === 'OpenTag' || node.name === 'HTMLTag') {
            const htmlNodeDetails = (0, htmlNodeInfo_1.default)(node, state);
            matches = (htmlNodeDetails === null || htmlNodeDetails === void 0 ? void 0 : htmlNodeDetails.getAttr('id')) === hash || (htmlNodeDetails === null || htmlNodeDetails === void 0 ? void 0 : htmlNodeDetails.getAttr('name')) === hash;
        }
        if (matches) {
            targetLocation = node.to + offset;
            return false;
        }
        const keepIterating = !matches;
        return keepIterating;
    };
    // Iterate over the entire syntax tree.
    const timeout = 1000; // Maximum time to spend parsing the syntax tree
    const tree = (_a = (0, language_1.ensureSyntaxTree)(state, state.doc.length, timeout)) !== null && _a !== void 0 ? _a : (0, language_1.syntaxTree)(state);
    tree.iterate({
        enter: makeEnterNode(0),
    });
    return targetLocation;
};
exports.default = findPositionMatchingLink;
//# sourceMappingURL=findPositionMatchingLink.js.map