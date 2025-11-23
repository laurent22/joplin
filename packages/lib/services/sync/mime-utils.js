"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromDataUrl = exports.toFileExtension = exports.fromFilename = exports.fromFileExtension = void 0;
const mimeTypes = require('./mime-utils-types');
const fromFileExtension = (ext) => {
    ext = ext.toLowerCase();
    for (let i = 0; i < mimeTypes.length; i++) {
        const t = mimeTypes[i];
        if (t.e.indexOf(ext) >= 0) {
            return t.t;
        }
    }
    return null;
};
exports.fromFileExtension = fromFileExtension;
const fromFilename = (name) => {
    if (!name)
        return null;
    const splitted = name.trim().split('.');
    if (splitted.length <= 1)
        return null;
    return (0, exports.fromFileExtension)(splitted[splitted.length - 1]);
};
exports.fromFilename = fromFilename;
const toFileExtension = (mimeType) => {
    mimeType = mimeType.toLowerCase();
    for (let i = 0; i < mimeTypes.length; i++) {
        const t = mimeTypes[i];
        if (mimeType === t.t) {
            // Return the first file extension that is 3 characters long
            // If none exist return the first one in the list.
            for (let j = 0; j < t.e.length; j++) {
                if (t.e[j].length === 3)
                    return t.e[j];
            }
            return t.e[0];
        }
    }
    return null;
};
exports.toFileExtension = toFileExtension;
const fromDataUrl = (dataUrl) => {
    // Example: data:image/jpeg;base64,/9j/4AAQSkZJR.....
    const defaultMime = 'text/plain';
    const p = dataUrl.substr(0, dataUrl.indexOf(',')).split(';');
    let s = p[0];
    const result = s.split(':');
    if (result.length <= 1)
        return defaultMime;
    s = result[1];
    return s.indexOf('/') >= 0 ? s : defaultMime; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
};
exports.fromDataUrl = fromDataUrl;
