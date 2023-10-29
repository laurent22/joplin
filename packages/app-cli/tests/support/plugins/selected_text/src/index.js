"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("api");
const types_1 = require("api/types");
function allEqual(input, char) {
    return input.split('').every(c => c === char);
}
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            api_1.default.commands.register({
                name: 'prettyMarkdownTable',
                label: 'Reformat the selected Markdown table',
                iconName: 'fas fa-music',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    const selectedText = yield api_1.default.commands.execute('selectedText');
                    const lines = selectedText.split('\n');
                    const cellWidths = [];
                    for (let line of lines) {
                        const cells = line.split('|');
                        for (let i = 0; i < cells.length; i++) {
                            const c = cells[i].trim();
                            if (i >= cellWidths.length)
                                cellWidths.push(0);
                            if (c.length > cellWidths[i]) {
                                cellWidths[i] = c.length;
                            }
                        }
                    }
                    const newLines = [];
                    for (let line of lines) {
                        const cells = line.split('|');
                        const newCells = [];
                        for (let i = 0; i < cells.length; i++) {
                            const c = cells[i].trim();
                            const newContent = c.padEnd(cellWidths[i], allEqual(c, '-') ? '-' : ' ');
                            newCells.push(newContent);
                        }
                        newLines.push(newCells.join(' | '));
                    }
                    yield api_1.default.commands.execute('replaceSelection', newLines.join('\n'));
                }),
            });
            api_1.default.views.toolbarButtons.create('prettyMarkdownTableButton', 'prettyMarkdownTable', types_1.ToolbarButtonLocation.EditorToolbar);
        });
    },
});
//# sourceMappingURL=index.js.map