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
const testUtils_1 = require("../utils/testing/testUtils");
describe('KeyValueModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('KeyValueModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should set and get value', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const m = (0, testUtils_1.models)().keyValue();
            yield m.setValue('testing1', 'something');
            yield m.setValue('testing2', 1234);
            expect(yield m.value('testing1')).toBe('something');
            expect(yield m.value('testing2')).toBe(1234);
            yield m.setValue('testing1', 456);
            expect(yield m.value('testing1')).toBe(456);
        });
    });
    test('should delete value', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const m = (0, testUtils_1.models)().keyValue();
            yield m.setValue('testing1', 'something');
            yield m.deleteValue('testing1');
            expect(yield m.value('testing1')).toBe(null);
        });
    });
});
//# sourceMappingURL=KeyValueModel.test.js.map