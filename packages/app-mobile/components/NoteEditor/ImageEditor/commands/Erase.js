"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EditorImage_1 = require("../EditorImage");
class Erase {
    constructor(toRemove) {
        // Clone the list
        this.toRemove = toRemove.map(elem => elem);
    }
    apply(editor) {
        var _a;
        for (const elem of this.toRemove) {
            (_a = editor.image.findParent(elem)) === null || _a === void 0 ? void 0 : _a.remove();
        }
    }
    unapply(editor) {
        for (const part of this.toRemove) {
            if (!editor.image.findParent(part)) {
                new EditorImage_1.default.AddElementCommand(part).apply(editor);
            }
        }
    }
}
exports.default = Erase;
//# sourceMappingURL=Erase.js.map