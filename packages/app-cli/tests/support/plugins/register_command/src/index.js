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
            yield api_1.default.commands.register({
                name: 'testCommand1',
                label: 'My Test Command 1',
                iconName: 'fas fa-music',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    alert('Testing plugin command 1');
                }),
            });
            yield api_1.default.commands.register({
                name: 'testCommand2',
                label: 'My Test Command 2',
                iconName: 'fas fa-drum',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    alert('Testing plugin command 2');
                }),
            });
            yield api_1.default.commands.register({
                name: 'contextMenuCommandExample',
                label: 'My Context Menu command',
                execute: (noteIds) => __awaiter(this, void 0, void 0, function* () {
                    const notes = [];
                    for (const noteId of noteIds) {
                        notes.push(yield api_1.default.data.get(['notes', noteId]));
                    }
                    const noteTitles = notes.map((note) => note.title);
                    alert('The following notes will be processed:\n\n' + noteTitles.join(', '));
                }),
            });
            yield api_1.default.commands.register({
                name: 'folderContextMenuExample',
                label: 'Folder menu item from plugin',
                execute: (folderId) => __awaiter(this, void 0, void 0, function* () {
                    console.info('Click on folder: ' + folderId);
                }),
            });
            yield api_1.default.commands.register({
                name: 'tagContextMenuExample',
                label: 'Tag menu item from plugin',
                execute: (tagId) => __awaiter(this, void 0, void 0, function* () {
                    console.info('Click on tag: ' + tagId);
                }),
            });
            // Commands that return a result and take argument can only be used
            // programmatically, so it's not necessary to set a label and icon.
            yield api_1.default.commands.register({
                name: 'commandWithResult',
                execute: (arg1, arg2) => __awaiter(this, void 0, void 0, function* () {
                    return 'I got: ' + arg1 + ' and ' + arg2;
                }),
            });
            // Add the first command to the note toolbar
            yield api_1.default.views.toolbarButtons.create('myButton1', 'testCommand1', types_1.ToolbarButtonLocation.NoteToolbar);
            // Add the second command to the editor toolbar
            yield api_1.default.views.toolbarButtons.create('myButton2', 'testCommand2', types_1.ToolbarButtonLocation.EditorToolbar);
            // Also add the commands to the menu
            yield api_1.default.views.menuItems.create('myMenuItem1', 'testCommand1', types_1.MenuItemLocation.Tools, { accelerator: 'CmdOrCtrl+Alt+Shift+B' });
            yield api_1.default.views.menuItems.create('myMenuItem2', 'testCommand2', types_1.MenuItemLocation.Tools);
            yield api_1.default.views.menuItems.create('contextMenuItem1', 'contextMenuCommandExample', types_1.MenuItemLocation.NoteListContextMenu);
            yield api_1.default.views.menuItems.create('folderMenuItem1', 'folderContextMenuExample', types_1.MenuItemLocation.FolderContextMenu);
            yield api_1.default.views.menuItems.create('tagMenuItem1', 'tagContextMenuExample', types_1.MenuItemLocation.TagContextMenu);
            console.info('Running command with arguments...');
            const result = yield api_1.default.commands.execute('commandWithResult', 'abcd', 123);
            console.info('Result was: ' + result);
        });
    },
});
//# sourceMappingURL=index.js.map