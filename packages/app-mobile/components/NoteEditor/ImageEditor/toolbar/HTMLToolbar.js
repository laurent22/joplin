"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ToolController_1 = require("../tools/ToolController");
const types_1 = require("../types");
/**
 * An HTML implementation of the toolbar. This implementation is primarially intended for
 * debugging purposes — when the editor is running directly in a browser.
 */
class HTMLToolbar {
    constructor(editor, parent) {
        this.editor = editor;
        editor.notifier.on(types_1.EditorEventType.ToolEnabled, (tool) => this.onToolEnabled(tool));
        editor.notifier.on(types_1.EditorEventType.ToolDisabled, (tool) => this.onToolDisabled(tool));
        this.container = document.createElement('div');
        this.container.classList.add('toolbar');
        this.addElements();
        parent.appendChild(this.container);
    }
    onToolEnabled(toolEvent) {
        var _a;
        if (toolEvent.kind !== types_1.EditorEventType.ToolEnabled) {
            throw new Error(`Wrong event type ${toolEvent.kind}`);
        }
        (_a = this.toolButtons[toolEvent.toolType]) === null || _a === void 0 ? void 0 : _a.forEach(tool => tool.onToolEnabled());
    }
    onToolDisabled(toolEvent) {
        var _a;
        if (toolEvent.kind !== types_1.EditorEventType.ToolDisabled) {
            throw new Error(`Wrong event type ${toolEvent.kind}`);
        }
        (_a = this.toolButtons[toolEvent.toolType]) === null || _a === void 0 ? void 0 : _a.forEach(tool => tool.onToolDisabled());
    }
    addToolButton(toolType, toolName) {
        var _a;
        var _b;
        const button = document.createElement('button');
        button.innerText = `Toggle ${toolName}`;
        button.classList.add('toolButton');
        button.onclick = () => {
            const toolController = this.editor.toolController;
            const isEnabled = toolController.isToolEnabled(toolType);
            const cmd = ToolController_1.default.setToolEnabled(toolType, !isEnabled);
            cmd.apply(this.editor);
        };
        const onToolEnabled = () => {
            button.classList.remove('toolDisabled');
        };
        const onToolDisabled = () => {
            button.classList.add('toolDisabled');
        };
        if (this.editor.toolController.isToolEnabled(toolType)) {
            onToolEnabled();
        }
        else {
            onToolDisabled();
        }
        (_a = (_b = this.toolButtons)[toolType]) !== null && _a !== void 0 ? _a : (_b[toolType] = []);
        this.toolButtons[toolType].push({
            onToolEnabled,
            onToolDisabled,
        });
        this.container.appendChild(button);
    }
    addElements() {
        this.addToolButton(ToolController_1.ToolType.TouchPanZoom, 'Touch Panning');
        this.addToolButton(ToolController_1.ToolType.Eraser, 'Eraser');
        this.addToolButton(ToolController_1.ToolType.Selection, 'Select Tool');
    }
}
exports.default = HTMLToolbar;
//# sourceMappingURL=HTMLToolbar.js.map