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
const shim_1 = require("./shim");
class RotatingLogs {
    constructor(logFilesDir, maxFileSize = null, inactiveMaxAge = null) {
        this.maxFileSize = 1024 * 1024 * 100;
        this.inactiveMaxAge = 90 * 24 * 60 * 60 * 1000;
        this.logFilesDir = logFilesDir;
        if (maxFileSize)
            this.maxFileSize = maxFileSize;
        if (inactiveMaxAge)
            this.inactiveMaxAge = inactiveMaxAge;
    }
    cleanActiveLogFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.fsDriver().stat(this.logFileFullpath());
            if (stats.size >= this.maxFileSize) {
                const newLogFile = this.logFileFullpath(this.getNameToNonActiveLogFile());
                yield this.fsDriver().move(this.logFileFullpath(), newLogFile);
            }
        });
    }
    getNameToNonActiveLogFile() {
        return `log-${Date.now()}.txt`;
    }
    deleteNonActiveLogFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield this.fsDriver().readDirStats(this.logFilesDir);
            for (const file of files) {
                if (!file.path.match(/^log-[0-9]+.txt$/gi))
                    continue;
                const ageOfTheFile = Date.now() - file.birthtime;
                if (ageOfTheFile >= this.inactiveMaxAge) {
                    yield this.fsDriver().remove(this.logFileFullpath(file.path));
                }
            }
        });
    }
    logFileFullpath(fileName = 'log.txt') {
        return `${this.logFilesDir}/${fileName}`;
    }
    fsDriver() {
        return shim_1.default.fsDriver();
    }
}
exports.default = RotatingLogs;
//# sourceMappingURL=RotatingLogs.js.map