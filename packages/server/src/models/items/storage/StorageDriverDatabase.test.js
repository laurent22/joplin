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
const db_1 = require("../../../db");
const testUtils_1 = require("../../../utils/testing/testUtils");
const types_1 = require("../../../utils/types");
const StorageDriverDatabase_1 = require("./StorageDriverDatabase");
const testUtils_2 = require("./testUtils");
const newDriver = () => {
    return new StorageDriverDatabase_1.default(1, {
        dbClientType: (0, db_1.clientType)((0, testUtils_1.db)()),
    });
};
const newConfig = () => {
    return {
        type: types_1.StorageDriverType.Database,
    };
};
describe('StorageDriverDatabase', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('StorageDriverDatabase');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    (0, testUtils_2.shouldWriteToContentAndReadItBack)(newConfig());
    (0, testUtils_2.shouldDeleteContent)(newConfig());
    (0, testUtils_2.shouldNotCreateItemIfContentNotSaved)(newConfig());
    (0, testUtils_2.shouldNotUpdateItemIfContentNotSaved)(newConfig());
    (0, testUtils_2.shouldSupportFallbackDriver)(newConfig(), { type: types_1.StorageDriverType.Memory });
    (0, testUtils_2.shouldSupportFallbackDriverInReadWriteMode)(newConfig(), { type: types_1.StorageDriverType.Memory, mode: types_1.StorageDriverMode.ReadAndWrite });
    (0, testUtils_2.shouldUpdateContentStorageIdAfterSwitchingDriver)(newConfig(), { type: types_1.StorageDriverType.Memory });
    (0, testUtils_2.shouldThrowNotFoundIfNotExist)(newConfig());
    test('should fail if the item row does not exist', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = newDriver();
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return driver.read('oops', { models: (0, testUtils_1.models)() }); }));
        });
    });
    test('should do nothing if deleting non-existing row', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = newDriver();
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return driver.delete('oops', { models: (0, testUtils_1.models)() }); }));
        });
    });
});
//# sourceMappingURL=StorageDriverDatabase.test.js.map