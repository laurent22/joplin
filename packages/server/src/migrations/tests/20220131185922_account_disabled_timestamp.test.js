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
const types_1 = require("../../services/database/types");
const testUtils_1 = require("../../utils/testing/testUtils");
const _20220131185922_account_disabled_timestamp_1 = require("../20220131185922_account_disabled_timestamp");
describe('20220131185922_account_disabled_timestamp', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('20220131185922_account_disabled_timestamp');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should set the user account disabled time', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const user1 = yield (0, testUtils_1.createUser)(1);
            const user2 = yield (0, testUtils_1.createUser)(2);
            const user3 = yield (0, testUtils_1.createUser)(3);
            const user4 = yield (0, testUtils_1.createUser)(4);
            jest.useFakeTimers();
            // -------------------------------------------------
            // User 1
            // -------------------------------------------------
            const t0 = new Date('2021-12-14').getTime();
            jest.setSystemTime(t0);
            yield (0, testUtils_1.models)().userFlag().add(user1.id, types_1.UserFlagType.AccountOverLimit);
            // -------------------------------------------------
            // User 2
            // -------------------------------------------------
            const t1 = new Date('2021-12-15').getTime();
            jest.setSystemTime(t1);
            yield (0, testUtils_1.models)().userFlag().add(user2.id, types_1.UserFlagType.FailedPaymentFinal);
            const t2 = new Date('2021-12-16').getTime();
            jest.setSystemTime(t2);
            yield (0, testUtils_1.models)().userFlag().add(user2.id, types_1.UserFlagType.ManuallyDisabled);
            // -------------------------------------------------
            // User 3
            // -------------------------------------------------
            const t3 = new Date('2021-12-17').getTime();
            jest.setSystemTime(t3);
            yield (0, testUtils_1.models)().userFlag().add(user3.id, types_1.UserFlagType.SubscriptionCancelled);
            const userIds = yield (0, _20220131185922_account_disabled_timestamp_1.disabledUserIds)((0, testUtils_1.db)());
            expect(userIds.sort()).toEqual([user2.id, user3.id].sort());
            yield (0, _20220131185922_account_disabled_timestamp_1.setUserAccountDisabledTimes)((0, testUtils_1.db)(), userIds);
            expect((yield (0, testUtils_1.models)().user().load(user1.id)).disabled_time).toBe(0);
            expect((yield (0, testUtils_1.models)().user().load(user2.id)).disabled_time).toBe(t1);
            expect((yield (0, testUtils_1.models)().user().load(user3.id)).disabled_time).toBe(t3);
            expect((yield (0, testUtils_1.models)().user().load(user4.id)).disabled_time).toBe(0);
            jest.useRealTimers();
        });
    });
});
//# sourceMappingURL=20220131185922_account_disabled_timestamp.test.js.map