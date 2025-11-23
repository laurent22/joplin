"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = shuffle;
exports.unique = unique;
function shuffle(array) {
    array = array.slice();
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
function unique(array) {
    return array.filter((elem, index, self) => {
        return index === self.indexOf(elem);
    });
}
