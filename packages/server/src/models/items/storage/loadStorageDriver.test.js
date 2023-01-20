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
const testUtils_1 = require("../../../utils/testing/testUtils");
const types_1 = require("../../../utils/types");
const loadStorageDriver_1 = require("./loadStorageDriver");
describe('loadStorageDriver', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('loadStorageDriver');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should load a driver and assign an ID to it', function () {
        return __awaiter(this, void 0, void 0, function* () {
            {
                const newDriver = yield (0, loadStorageDriver_1.default)({ type: types_1.StorageDriverType.Memory }, (0, testUtils_1.db)());
                expect(newDriver.storageId).toBe(1);
                expect((yield (0, testUtils_1.models)().storage().count())).toBe(1);
            }
            {
                const newDriver = yield (0, loadStorageDriver_1.default)({ type: types_1.StorageDriverType.Filesystem, path: '/just/testing' }, (0, testUtils_1.db)());
                expect(newDriver.storageId).toBe(2);
                expect((yield (0, testUtils_1.models)().storage().count())).toBe(2);
            }
        });
    });
    test('should not record the same storage connection twice', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.db)()('storages').insert({
                connection_string: 'Type=Database',
                updated_time: Date.now(),
                created_time: Date.now(),
            });
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () {
                return yield (0, testUtils_1.db)()('storages').insert({
                    connection_string: 'Type=Database',
                    updated_time: Date.now(),
                    created_time: Date.now(),
                });
            }));
        });
    });
});
//# sourceMappingURL=loadStorageDriver.test.js.map