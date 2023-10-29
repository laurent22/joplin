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
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            api_1.default.commands.register({
                name: 'concatSelectedNotes',
                label: 'Concatenate selected notes into one',
                iconName: 'fas fa-music',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    const noteIds = yield api_1.default.workspace.selectedNoteIds();
                    const newNoteBody = [];
                    let parentId = null;
                    for (const noteId of noteIds) {
                        const note = yield api_1.default.data.get(['notes', noteId], { fields: ['title', 'body', 'parent_id'] });
                        newNoteBody.push([
                            '# ' + note.title,
                            '',
                            note.body,
                        ].join('\n'));
                        if (!parentId)
                            parentId = note.parent_id;
                    }
                    const newNote = {
                        title: 'Concatenated note',
                        body: newNoteBody.join('\n\n'),
                        parent_id: parentId,
                    };
                    yield api_1.default.data.post(['notes'], null, newNote);
                }),
            });
            api_1.default.views.menuItems.create('concatSelectedNotes', types_1.MenuItemLocation.Context);
        });
    },
});
//# sourceMappingURL=index.js.map