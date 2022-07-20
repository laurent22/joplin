"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseTool_1 = require("./BaseTool");
class Eraser extends BaseTool_1.default {
    constructor() {
        super();
    }
    onPointerDown(event) {
        throw new Error("Method not implemented.");
    }
    onPointerMove(event) {
        throw new Error("Method not implemented.");
    }
    onPointerUp(event) {
        throw new Error("Method not implemented.");
    }
    onGestureCancel() {
        throw new Error("Method not implemented.");
    }
}
exports.default = Eraser;
//# sourceMappingURL=Eraser.js.map