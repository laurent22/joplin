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
exports.readCredentialFile = exports.credentialFile = exports.credentialDir = void 0;
const fs = require('fs-extra');
function credentialDir() {
    return __awaiter(this, void 0, void 0, function* () {
        const username = require('os').userInfo().username;
        const toTry = [
            `c:/Users/${username}/joplin-credentials`,
            `/mnt/c/Users/${username}/joplin-credentials`,
            `/home/${username}/joplin-credentials`,
            `/Users/${username}/joplin-credentials`,
        ];
        for (const dirPath of toTry) {
            if (yield fs.pathExists(dirPath))
                return dirPath;
        }
        throw new Error(`Could not find credential directory in any of these paths: ${JSON.stringify(toTry)}`);
    });
}
exports.credentialDir = credentialDir;
function credentialFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = yield credentialDir();
        const output = `${rootDir}/${filename}`;
        if (!(yield fs.pathExists(output)))
            throw new Error(`No such file: ${output}`);
        return output;
    });
}
exports.credentialFile = credentialFile;
function readCredentialFile(filename, defaultValue = '') {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const filePath = yield credentialFile(filename);
            const r = yield fs.readFile(filePath);
            return r.toString();
        }
        catch (error) {
            return defaultValue;
        }
    });
}
exports.readCredentialFile = readCredentialFile;
//# sourceMappingURL=credentialFiles.js.map