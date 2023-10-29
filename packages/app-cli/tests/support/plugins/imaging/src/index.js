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
                name: 'makeThumbnail',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    // ---------------------------------------------------------------
                    // Get the current note
                    // ---------------------------------------------------------------
                    const noteIds = yield api_1.default.workspace.selectedNoteIds();
                    if (noteIds.length !== 1)
                        return;
                    const noteId = noteIds[0];
                    // ---------------------------------------------------------------
                    // Get the top resource in that note (if any)
                    // ---------------------------------------------------------------
                    const result = yield api_1.default.data.get(['notes', noteId, 'resources']);
                    if (result.items.length <= 0)
                        return;
                    const resource = result.items[0];
                    // ---------------------------------------------------------------
                    // Create an image object and resize it
                    // ---------------------------------------------------------------
                    const imageHandle = yield api_1.default.imaging.createFromResource(resource.id);
                    const resizedImageHandle = yield api_1.default.imaging.resize(imageHandle, { width: 100 });
                    // ---------------------------------------------------------------
                    // Convert the image to a resource and add it to the note
                    // ---------------------------------------------------------------
                    const newResource = yield api_1.default.imaging.toJpgResource(resizedImageHandle, { title: "Thumbnail" });
                    yield api_1.default.commands.execute('insertText', '\n![](:/' + newResource.id + ')');
                    // ---------------------------------------------------------------
                    // Free up the image objects at the end
                    // ---------------------------------------------------------------
                    yield api_1.default.imaging.free(imageHandle);
                    yield api_1.default.imaging.free(resizedImageHandle);
                }),
            });
            yield api_1.default.views.toolbarButtons.create('makeThumbnailButton', 'makeThumbnail', types_1.ToolbarButtonLocation.EditorToolbar);
        });
    },
});
//# sourceMappingURL=index.js.map