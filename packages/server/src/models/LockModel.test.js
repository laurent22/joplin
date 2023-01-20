"use strict";
// Note that a lot of the testing logic is done from
// synchronizer_LockHandler.test so to fully test that it works, Joplin Server
// should be setup as a sync target for the test units.
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
const errors_1 = require("../utils/errors");
const testUtils_1 = require("../utils/testing/testUtils");
const LockHandler_1 = require("@joplin/lib/services/synchronizer/LockHandler");
describe('LockModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('LockModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should allow exclusive lock if the sync locks have expired', function () {
        return __awaiter(this, void 0, void 0, function* () {
            jest.useFakeTimers();
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const t1 = new Date('2020-01-01').getTime();
            jest.setSystemTime(t1);
            yield (0, testUtils_1.models)().lock().acquireLock(user.id, LockHandler_1.LockType.Sync, LockHandler_1.LockClientType.Desktop, '1111');
            yield (0, testUtils_1.models)().lock().acquireLock(user.id, LockHandler_1.LockType.Sync, LockHandler_1.LockClientType.Desktop, '2222');
            // First confirm that it's not possible to acquire an exclusive lock if
            // there are sync locks.
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().lock().acquireLock(user.id, LockHandler_1.LockType.Exclusive, LockHandler_1.LockClientType.Desktop, '3333'); }), errors_1.ErrorConflict.httpCode);
            jest.setSystemTime(t1 + LockHandler_1.defaultLockTtl + 1);
            // Now that the sync locks have expired check that it's possible to
            // acquire a sync lock.
            const exclusiveLock = yield (0, testUtils_1.models)().lock().acquireLock(user.id, LockHandler_1.LockType.Exclusive, LockHandler_1.LockClientType.Desktop, '3333');
            expect(exclusiveLock).toBeTruthy();
            jest.useRealTimers();
        });
    });
    test('should keep user locks separated', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.models)().lock().acquireLock(user1.id, LockHandler_1.LockType.Sync, LockHandler_1.LockClientType.Desktop, '1111');
            // If user 1 tries to get an exclusive lock, it should fail
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().lock().acquireLock(user1.id, LockHandler_1.LockType.Exclusive, LockHandler_1.LockClientType.Desktop, '3333'); }), errors_1.ErrorConflict.httpCode);
            // But it should work for user 2
            const exclusiveLock = yield (0, testUtils_1.models)().lock().acquireLock(user2.id, LockHandler_1.LockType.Exclusive, LockHandler_1.LockClientType.Desktop, '3333');
            expect(exclusiveLock).toBeTruthy();
        });
    });
    test('should validate locks', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().lock().acquireLock(user1.id, 'wrongtype', LockHandler_1.LockClientType.Desktop, '1111'); }), errors_1.ErrorUnprocessableEntity.httpCode);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().lock().acquireLock(user1.id, LockHandler_1.LockType.Exclusive, 'wrongclienttype', '1111'); }), errors_1.ErrorUnprocessableEntity.httpCode);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().lock().acquireLock(user1.id, LockHandler_1.LockType.Exclusive, LockHandler_1.LockClientType.Desktop, 'veryverylongclientidveryverylongclientidveryverylongclientidveryverylongclientid'); }), errors_1.ErrorUnprocessableEntity.httpCode);
        });
    });
    test('should expire locks', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            jest.useFakeTimers();
            const t1 = new Date('2020-01-01').getTime();
            jest.setSystemTime(t1);
            yield (0, testUtils_1.models)().lock().acquireLock(user.id, LockHandler_1.LockType.Sync, LockHandler_1.LockClientType.Desktop, '1111');
            const lock1 = (yield (0, testUtils_1.models)().lock().allLocks(user.id))[0];
            jest.setSystemTime(t1 + (0, testUtils_1.models)().lock().lockTtl + 1);
            // If we call this again, at the same time it should expire old timers.
            yield (0, testUtils_1.models)().lock().acquireLock(user.id, LockHandler_1.LockType.Sync, LockHandler_1.LockClientType.Desktop, '2222');
            expect((yield (0, testUtils_1.models)().lock().allLocks(user.id)).length).toBe(1);
            const lock2 = (yield (0, testUtils_1.models)().lock().allLocks(user.id))[0];
            expect(lock1.id).not.toBe(lock2.id);
            jest.useRealTimers();
        });
    });
});
//# sourceMappingURL=LockModel.test.js.map