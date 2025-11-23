"use strict";
/* eslint no-useless-escape: 0*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendlySafeFilename = friendlySafeFilename;
const locale_1 = require("./locale");
const path_1 = require("@joplin/utils/path");
__exportStar(require("@joplin/utils/path"), exports);
let friendlySafeFilename_blackListChars = '/\n\r<>:\'"\\|?*#';
for (let i = 0; i < 32; i++) {
    friendlySafeFilename_blackListChars += String.fromCharCode(i);
}
const friendlySafeFilename_blackListNames = ['.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
// The goal of this function is to provide a safe filename, that should work in
// any filesystem, but that's still user friendly, in particular because it
// supports any charset - Chinese, Russian, etc.
//
// "Safe" however doesn't mean it can be safely inserted in any content (HTML,
// Markdown, etc.) - it still needs to be encoded by the calling code according
// to the context.
function friendlySafeFilename(e, maxLength = null, preserveExtension = false) {
    // Although Windows supports paths up to 255 characters, but that includes the filename and its
    // parent directory path. Also there's generally no good reason for dir or file names
    // to be so long, so keep it at 50, which should prevent various errors.
    if (maxLength === null)
        maxLength = 50;
    if (!e || !e.replace)
        return (0, locale_1._)('Untitled');
    let fileExt = '';
    if (preserveExtension) {
        const baseExt = (0, path_1.fileExtension)(e);
        fileExt = baseExt ? `.${(0, path_1.safeFileExtension)(baseExt)}` : '';
        e = (0, path_1.filename)(e);
    }
    let output = '';
    for (let i = 0; i < e.length; i++) {
        const c = e[i];
        if (friendlySafeFilename_blackListChars.indexOf(c) >= 0) {
            output += '_';
        }
        else {
            output += c;
        }
    }
    if (output.length <= 4) {
        if (friendlySafeFilename_blackListNames.indexOf(output.toUpperCase()) >= 0) {
            output = '___';
        }
    }
    while (output.length) {
        const c = output[output.length - 1];
        if (c === ' ' || c === '.') {
            output = output.substr(0, output.length - 1);
        }
        else {
            break;
        }
    }
    while (output.length) {
        const c = output[0];
        if (c === ' ') {
            output = output.substr(1, output.length - 1);
        }
        else {
            break;
        }
    }
    if (!output)
        return (0, locale_1._)('Untitled') + fileExt;
    return output.substr(0, maxLength) + fileExt;
}
