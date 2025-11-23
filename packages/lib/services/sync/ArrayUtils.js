"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pull = exports.shuffle = exports.mergeOverlappingIntervals = exports.contentEquals = exports.findByKey = exports.binarySearch = exports.removeElement = exports.unique = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const unique = function (array) {
    return array.filter((elem, index, self) => {
        return index === self.indexOf(elem);
    });
};
exports.unique = unique;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const removeElement = function (array, element) {
    const index = array.indexOf(element);
    if (index < 0)
        return array;
    const newArray = array.slice();
    newArray.splice(index, 1);
    return newArray;
};
exports.removeElement = removeElement;
// https://stackoverflow.com/a/10264318/561309
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const binarySearch = function (items, value) {
    let startIndex = 0, stopIndex = items.length - 1, middle = Math.floor((stopIndex + startIndex) / 2);
    while (items[middle] !== value && startIndex < stopIndex) {
        // adjust search area
        if (value < items[middle]) {
            stopIndex = middle - 1;
        }
        else if (value > items[middle]) {
            startIndex = middle + 1;
        }
        // recalculate middle
        middle = Math.floor((stopIndex + startIndex) / 2);
    }
    // make sure it's the right value
    return items[middle] !== value ? -1 : middle;
};
exports.binarySearch = binarySearch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const findByKey = function (array, key, value) {
    for (let i = 0; i < array.length; i++) {
        const o = array[i];
        if (typeof o !== 'object')
            continue;
        if (o[key] === value)
            return o;
    }
    return null;
};
exports.findByKey = findByKey;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const contentEquals = function (array1, array2) {
    if (array1 === array2)
        return true;
    if (!array1.length && !array2.length)
        return true;
    if (array1.length !== array2.length)
        return false;
    for (let i = 0; i < array1.length; i++) {
        const a1 = array1[i];
        if (array2.indexOf(a1) < 0)
            return false;
    }
    return true;
};
exports.contentEquals = contentEquals;
// Merges multiple overlapping intervals into a single interval
// e.g. [0, 25], [20, 50], [75, 100] --> [0, 50], [75, 100]
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mergeOverlappingIntervals = function (intervals, limit) {
    intervals.sort((a, b) => a[0] - b[0]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const stack = [];
    if (intervals.length) {
        stack.push(intervals[0]);
        for (let i = 1; i < intervals.length && stack.length < limit; i++) {
            const top = stack[stack.length - 1];
            if (top[1] < intervals[i][0]) {
                stack.push(intervals[i]);
            }
            else if (top[1] < intervals[i][1]) {
                top[1] = intervals[i][1];
                stack.pop();
                stack.push(top);
            }
        }
    }
    return stack;
};
exports.mergeOverlappingIntervals = mergeOverlappingIntervals;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const shuffle = function (array) {
    array = array.slice();
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};
exports.shuffle = shuffle;
// Used to replace lodash.pull, so that we don't need to import the whole
// package. Not optimised.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const pull = (array, ...elements) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const output = [];
    for (const e of array) {
        if (elements.includes(e))
            continue;
        output.push(e);
    }
    return output;
};
exports.pull = pull;
