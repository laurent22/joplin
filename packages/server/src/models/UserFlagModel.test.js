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
const types_1 = require("../services/database/types");
const testUtils_1 = require("../utils/testing/testUtils");
describe('UserFlagModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('UserFlagModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create no more than one flag per type', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const beforeTime = Date.now();
            yield (0, testUtils_1.models)().userFlag().add(user.id, types_1.UserFlagType.AccountOverLimit);
            const flag = yield (0, testUtils_1.models)().userFlag().byUserId(user.id, types_1.UserFlagType.AccountOverLimit);
            expect(flag.user_id).toBe(user.id);
            expect(flag.type).toBe(types_1.UserFlagType.AccountOverLimit);
            expect(flag.created_time).toBeGreaterThanOrEqual(beforeTime);
            expect(flag.updated_time).toBeGreaterThanOrEqual(beforeTime);
            const flagCountBefore = (yield (0, testUtils_1.models)().userFlag().all()).length;
            yield (0, testUtils_1.models)().userFlag().add(user.id, types_1.UserFlagType.AccountOverLimit);
            const flagCountAfter = (yield (0, testUtils_1.models)().userFlag().all()).length;
            expect(flagCountBefore).toBe(flagCountAfter);
            yield (0, testUtils_1.models)().userFlag().add(user.id, types_1.UserFlagType.FailedPaymentFinal);
            const flagCountAfter2 = (yield (0, testUtils_1.models)().userFlag().all()).length;
            expect(flagCountAfter2).toBe(flagCountBefore + 1);
            const differentFlag = yield (0, testUtils_1.models)().userFlag().byUserId(user.id, types_1.UserFlagType.FailedPaymentFinal);
            expect(flag.id).not.toBe(differentFlag.id);
        });
    });
    test('should set the timestamp when disabling an account', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const beforeTime = Date.now();
            yield (0, testUtils_1.models)().userFlag().add(user.id, types_1.UserFlagType.FailedPaymentFinal);
            expect((yield (0, testUtils_1.models)().user().load(user.id)).disabled_time).toBeGreaterThanOrEqual(beforeTime);
            yield (0, testUtils_1.models)().userFlag().remove(user.id, types_1.UserFlagType.FailedPaymentFinal);
            expect((yield (0, testUtils_1.models)().user().load(user.id)).disabled_time).toBe(0);
        });
    });
});
//# sourceMappingURL=UserFlagModel.test.js.map