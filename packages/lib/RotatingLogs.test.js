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
const fs_extra_1 = require("fs-extra");
const test_utils_1 = require("./testing/test-utils");
const RotatingLogs_1 = require("./RotatingLogs");
const createTestLogFile = (dir) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, fs_extra_1.writeFile)(`${dir}/log.txt`, 'some content');
});
describe('RotatingLogs', () => {
    test('should rename log.txt to log-TIMESTAMP.txt', () => __awaiter(void 0, void 0, void 0, function* () {
        let dir;
        try {
            dir = yield (0, test_utils_1.createTempDir)();
            yield createTestLogFile(dir);
            let files = yield (0, fs_extra_1.readdir)(dir);
            expect(files.find(file => file.match(/^log.txt$/gi))).toBeTruthy();
            expect(files.length).toBe(1);
            const rotatingLogs = new RotatingLogs_1.default(dir, 1, 1);
            yield rotatingLogs.cleanActiveLogFile();
            files = yield (0, fs_extra_1.readdir)(dir);
            expect(files.find(file => file.match(/^log.txt$/gi))).toBeFalsy();
            expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeTruthy();
            expect(files.length).toBe(1);
        }
        finally {
            yield (0, fs_extra_1.remove)(dir);
        }
    }));
    test('should delete inative log file after 1ms', () => __awaiter(void 0, void 0, void 0, function* () {
        let dir;
        try {
            dir = yield (0, test_utils_1.createTempDir)();
            yield createTestLogFile(dir);
            const rotatingLogs = new RotatingLogs_1.default(dir, 1, 1);
            yield rotatingLogs.cleanActiveLogFile();
            yield (0, test_utils_1.msleep)(1);
            yield rotatingLogs.deleteNonActiveLogFiles();
            const files = yield (0, fs_extra_1.readdir)(dir);
            expect(files.find(file => file.match(/^log-[0-9]+.txt$/gi))).toBeFalsy();
            expect(files.length).toBe(0);
        }
        finally {
            yield (0, fs_extra_1.remove)(dir);
        }
    }));
});
//# sourceMappingURL=RotatingLogs.test.js.map