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
exports.getRootDir = exports.splitCommandString = exports.commandToString = exports.execCommand = void 0;
const execCommand_1 = require("./execCommand");
exports.execCommand = execCommand_1.default;
const commandToString_1 = require("./commandToString");
exports.commandToString = commandToString_1.default;
const splitCommandString_1 = require("./splitCommandString");
exports.splitCommandString = splitCommandString_1.default;
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
let rootDir_ = '';
const getRootDir = () => __awaiter(void 0, void 0, void 0, function* () {
    if (rootDir_)
        return rootDir_;
    let p = (0, path_1.dirname)((0, path_1.dirname)((0, path_1.dirname)(__dirname)));
    for (let i = 0; i < 9999; i++) {
        if (yield (0, fs_extra_1.pathExists)(`${p}/.eslintrc.js`)) {
            rootDir_ = p;
            return rootDir_;
        }
        p = (0, path_1.dirname)(p);
    }
    throw new Error('Could not find root dir');
});
exports.getRootDir = getRootDir;
//# sourceMappingURL=index.js.map