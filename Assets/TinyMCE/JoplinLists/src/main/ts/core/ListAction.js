"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listToggleActionFromListName = void 0;
const listToggleActionFromListName = (listName) => {
    switch (listName) {
        case 'UL': return "ToggleUlList" /* ListAction.ToggleUlList */;
        case 'OL': return "ToggleOlList" /* ListAction.ToggleOlList */;
        case 'DL': return "ToggleDLList" /* ListAction.ToggleDLList */;
    }
};
exports.listToggleActionFromListName = listToggleActionFromListName;
//# sourceMappingURL=ListAction.js.map