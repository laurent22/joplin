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
const uslug = require('@joplin/fork-uslug');
// From https://stackoverflow.com/a/6234804/561309
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function noteHeaders(noteBody) {
    const headers = [];
    const lines = noteBody.split('\n');
    for (const line of lines) {
        const match = line.match(/^(#+)\s(.*)*/);
        if (!match)
            continue;
        headers.push({
            level: match[1].length,
            text: match[2],
        });
    }
    return headers;
}
let slugs = {};
function headerSlug(headerText) {
    const s = uslug(headerText);
    let num = slugs[s] ? slugs[s] : 1;
    const output = [s];
    if (num > 1)
        output.push(num);
    slugs[s] = num + 1;
    return output.join('-');
}
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            const panels = api_1.default.views.panels;
            const view = yield panels.create("panel_1");
            yield panels.setHtml(view, 'Loading...');
            yield panels.addScript(view, './webview.js');
            yield panels.addScript(view, './webview.css');
            yield panels.onMessage(view, (message) => {
                if (message.name === 'scrollToHash') {
                    api_1.default.commands.execute('scrollToHash', message.hash);
                }
            });
            function updateTocView() {
                return __awaiter(this, void 0, void 0, function* () {
                    const note = yield api_1.default.workspace.selectedNote();
                    slugs = {};
                    if (note) {
                        const headers = noteHeaders(note.body);
                        const itemHtml = [];
                        for (const header of headers) {
                            const slug = headerSlug(header.text);
                            itemHtml.push(`
						<p class="toc-item" style="padding-left:${(header.level - 1) * 15}px">
							<a class="toc-item-link" href="#" data-slug="${escapeHtml(slug)}">
								${escapeHtml(header.text)}
							</a>
						</p>
					`);
                        }
                        yield panels.setHtml(view, `
					<div class="container">
						${itemHtml.join('\n')}
					</div>
				`);
                    }
                    else {
                        yield panels.setHtml(view, 'Please select a note to view the table of content');
                    }
                });
            }
            api_1.default.workspace.onNoteSelectionChange(() => {
                updateTocView();
            });
            api_1.default.workspace.onNoteChange(() => {
                updateTocView();
            });
            yield api_1.default.commands.register({
                name: 'toggleToc',
                label: 'Toggle TOC',
                iconName: 'fas fa-drum',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    const isVisible = yield panels.visible(view);
                    yield panels.show(view, !isVisible);
                }),
            });
            yield api_1.default.views.toolbarButtons.create('toggleToc', 'toggleToc', types_1.ToolbarButtonLocation.NoteToolbar);
            updateTocView();
        });
    },
});
//# sourceMappingURL=index.js.map