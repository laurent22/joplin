"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Connects a group of tools -- eactly one tool in the group must be enabled. */
class ToolEnabledGroup {
    constructor() { }
    notifyEnabled(tool) {
        var _a;
        if (tool !== this.activeTool) {
            (_a = this.activeTool) === null || _a === void 0 ? void 0 : _a.setEnabled(false);
            this.activeTool = tool;
        }
    }
}
exports.default = ToolEnabledGroup;
//# sourceMappingURL=ToolEnabledGroup.js.map