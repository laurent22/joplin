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
const testUtils_1 = require("../../../utils/testing/testUtils");
const types_1 = require("../../../utils/types");
const StorageDriverFs_1 = require("./StorageDriverFs");
const testUtils_2 = require("./testUtils");
const basePath_ = (0, testUtils_1.tempDirPath)();
const newDriver = (path = null) => {
    return new StorageDriverFs_1.default(1, { path: path === null ? basePath_ : path });
};
const newConfig = (path = null) => {
    return {
        type: types_1.StorageDriverType.Filesystem,
        path: path === null ? basePath_ : path,
    };
};
describe('StorageDriverFs', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('StorageDriverFs');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, fs_extra_1.remove)(basePath_);
        yield (0, fs_extra_1.mkdirp)(basePath_);
    }));
    (0, testUtils_2.shouldWriteToContentAndReadItBack)(newConfig());
    (0, testUtils_2.shouldDeleteContent)(newConfig());
    (0, testUtils_2.shouldNotCreateItemIfContentNotSaved)(newConfig());
    (0, testUtils_2.shouldNotUpdateItemIfContentNotSaved)(newConfig());
    (0, testUtils_2.shouldSupportFallbackDriver)(newConfig(), { type: types_1.StorageDriverType.Memory });
    (0, testUtils_2.shouldSupportFallbackDriverInReadWriteMode)(newConfig(), { type: types_1.StorageDriverType.Memory, mode: types_1.StorageDriverMode.ReadAndWrite });
    (0, testUtils_2.shouldUpdateContentStorageIdAfterSwitchingDriver)(newConfig(), { type: types_1.StorageDriverType.Memory });
    (0, testUtils_2.shouldThrowNotFoundIfNotExist)(newConfig());
    test('should write to a file and read it back', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = newDriver();
            yield driver.write('testing', Buffer.from('testing'));
            const content = yield driver.read('testing');
            expect(content.toString()).toBe('testing');
        });
    });
    test('should automatically create the base path', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const tmp = `${(0, testUtils_1.tempDirPath)()}/testcreate`;
            expect(yield (0, fs_extra_1.pathExists)(tmp)).toBe(false);
            const driver = newDriver(tmp);
            yield driver.write('testing', Buffer.from('testing'));
            expect(yield (0, fs_extra_1.pathExists)(tmp)).toBe(true);
        });
    });
    test('should not throw if deleting a file that does not exist', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = newDriver();
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return driver.delete('notthere'); }));
        });
    });
});
//# sourceMappingURL=StorageDriverFs.test.js.map