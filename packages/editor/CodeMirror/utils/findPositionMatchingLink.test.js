"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const state_1 = require("@codemirror/state");
const createTestEditor_1 = __importDefault(require("../testing/createTestEditor"));
const findPositionMatchingLink_1 = __importDefault(require("./findPositionMatchingLink"));
describe('findPositionMatchingLink', () => {
    test.each([
        // Should match headings
        ['# Heading\n', '#heading', '# Heading'.length],
        ['# Heading', '#heading', '# Heading'.length],
        ['## Heading', '#heading', '## Heading'.length],
        ['### Heading', '#heading', '### Heading'.length],
        // Should match headings not on the first line
        ['\n### Heading', '#heading', '\n### Heading'.length],
        ['# Test\n\n### Heading', '#heading', '# Test\n\n### Heading'.length],
        ['# Test\n\n### Heading\n\ntest', '#heading', '# Test\n\n### Heading'.length],
        // Should return null when there are no matches
        ['# Heading', '#missing-heading', null],
        // Should match footnotes
        ['[^1]: Footnote!\n', '[^1]', '[^1]: Footnote!'.length],
        ['[^1]: Footnote!\n[^2]: Other footnote.', '[^1]', '[^1]: Footnote!'.length],
        ['# ^1\n[^1]: Footnote!\n[^2]: Other footnote.', '[^1]', '# ^1\n[^1]: Footnote!'.length],
        ['# ^1\n[^1]: Footnote!\n[^2]: Other footnote.', '[^not a footnote]', null],
        // Should not process http:// links
        ['# Test', 'http://example.com', null],
    ])('should correctly find lines matching the given link (doc: %j, link: %j) (case %#)', async (doc, link, expectedMatchingLine) => {
        var _a;
        const editor = await (0, createTestEditor_1.default)(doc, state_1.EditorSelection.cursor(0), []);
        expect((_a = (0, findPositionMatchingLink_1.default)(link, editor.state)) !== null && _a !== void 0 ? _a : null).toBe(expectedMatchingLine);
    });
});
//# sourceMappingURL=findPositionMatchingLink.test.js.map