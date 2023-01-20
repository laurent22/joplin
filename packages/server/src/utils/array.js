"use strict";
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unique = void 0;
function unique(array) {
    return array.filter(function (elem, index, self) {
        return index === self.indexOf(elem);
    });
}
exports.unique = unique;
//# sourceMappingURL=array.js.map