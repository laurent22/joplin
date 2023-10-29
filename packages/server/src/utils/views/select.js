"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesNoOptions = exports.yesNoDefaultOptions = exports.selectOption = exports.objectToSelectOptions = exports.yesNoDefaultLabel = void 0;
function yesNoDefaultLabel(_key, value) {
    if (value === '')
        return 'Default';
    return value ? 'Yes' : 'No';
}
exports.yesNoDefaultLabel = yesNoDefaultLabel;
function objectToSelectOptions(object, selectedValue, labelFn) {
    const output = [];
    for (const [key, value] of Object.entries(object)) {
        output.push({
            label: labelFn(key, value),
            selected: value === selectedValue,
            value: value,
        });
    }
    return output;
}
exports.objectToSelectOptions = objectToSelectOptions;
function selectOption(label, value, selected) {
    return { label, value, selected };
}
exports.selectOption = selectOption;
function yesNoDefaultOptions(object, key) {
    return [
        selectOption('Default', '', object[key] === null),
        selectOption('Yes', '1', object[key] === 1),
        selectOption('No', '0', object[key] === 0),
    ];
}
exports.yesNoDefaultOptions = yesNoDefaultOptions;
function yesNoOptions(object, key) {
    return [
        selectOption('Yes', '1', object[key] === 1),
        selectOption('No', '0', object[key] === 0),
    ];
}
exports.yesNoOptions = yesNoOptions;
//# sourceMappingURL=select.js.map