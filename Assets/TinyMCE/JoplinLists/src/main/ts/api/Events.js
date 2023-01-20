"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireListEvent = void 0;
const fireListEvent = (editor, action, element) => editor.fire('ListMutation', { action, element });
exports.fireListEvent = fireListEvent;
//# sourceMappingURL=Events.js.map