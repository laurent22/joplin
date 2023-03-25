"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteBodyIsScript = void 0;
const Folder_1 = require("./models/Folder");
const Note_1 = require("./models/Note");
const moment = require("moment");
const asyncToGen = require('async-to-gen');
const SCRIPT_BEGIN = '```js executable';
const SCRIPT_END = '```';
const isScript = (noteBody) => {
    const trimmedBody = noteBody.trim();
    return trimmedBody.startsWith(SCRIPT_BEGIN) && trimmedBody.endsWith(SCRIPT_END);
};
exports.noteBodyIsScript = isScript;
const parseScript = (noteBody) => {
    let scriptBody = noteBody.trim().substring(SCRIPT_BEGIN.length + 1);
    scriptBody = scriptBody.substring(0, scriptBody.length - SCRIPT_END.length - 1);
    return scriptBody;
};
class ScriptExecutor {
    static executeNote(noteId, dispatch, showMessage, errorCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentNote = yield Note_1.default.load(noteId);
            const currentFolder = yield Folder_1.default.load(currentNote.parent_id);
            if (isScript(currentNote.body)) {
                const script = parseScript(currentNote.body);
                try {
                    const transformed = asyncToGen(`const scriptFunction = (async function(currentNote, currentFolder, Note, Folder, moment, dispatch, print, error) {try{${script}}catch(e){error(e);}})`).toString();
                    const scriptFunction = eval(`${transformed}; scriptFunction`);
                    scriptFunction(currentNote, currentFolder, Note_1.default, Folder_1.default, moment, dispatch, showMessage, errorCallback);
                }
                catch (e) {
                    errorCallback(e);
                }
            }
        });
    }
}
exports.default = ScriptExecutor;
//# sourceMappingURL=ScriptExecutor.js.map