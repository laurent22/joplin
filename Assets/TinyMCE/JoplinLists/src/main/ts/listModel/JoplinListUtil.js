"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addJoplinChecklistCommands = exports.isJoplinChecklistItem = exports.findContainerListTypeFromElement = exports.findContainerListTypeFromEvent = exports.isCheckboxListItem = void 0;
function isCheckboxListItem(element) {
    return element.classList && element.classList.contains('joplin-checklist');
}
exports.isCheckboxListItem = isCheckboxListItem;
function findContainerListTypeFromEvent(event) {
    if (isCheckboxListItem(event.element))
        return 'joplinChecklist';
    for (const parent of event.parents) {
        if (isCheckboxListItem(parent))
            return 'joplinChecklist';
    }
    return 'regular';
}
exports.findContainerListTypeFromEvent = findContainerListTypeFromEvent;
function findContainerListTypeFromElement(element) {
    while (element) {
        if (element.nodeName === 'UL' || element.nodName === 'OL') {
            return isCheckboxListItem(element) ? 'joplinChecklist' : 'regular';
        }
        element = element.parentNode;
    }
    return 'regular';
}
exports.findContainerListTypeFromElement = findContainerListTypeFromElement;
function isJoplinChecklistItem(element) {
    if (element.nodeName !== 'LI')
        return false;
    const listType = findContainerListTypeFromElement(element);
    return listType === 'joplinChecklist';
}
exports.isJoplinChecklistItem = isJoplinChecklistItem;
function addJoplinChecklistCommands(editor, ToggleList) {
    editor.addCommand('ToggleJoplinChecklistItem', function (ui, detail) {
        const element = detail.element;
        if (!isJoplinChecklistItem(element))
            return;
        if (!element.classList || !element.classList.contains('checked')) {
            element.classList.add('checked');
        }
        else {
            element.classList.remove('checked');
        }
    });
    editor.addCommand('InsertJoplinChecklist', function (ui, detail) {
        detail = Object.assign({}, detail, { listType: 'joplinChecklist' });
        ToggleList.toggleList(editor, 'UL', detail);
    });
}
exports.addJoplinChecklistCommands = addJoplinChecklistCommands;
//# sourceMappingURL=JoplinListUtil.js.map