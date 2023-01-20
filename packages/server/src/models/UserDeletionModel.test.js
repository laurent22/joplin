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
const time_1 = require("../utils/time");
describe('UserDeletionModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('UserDeletionModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should add a deletion operation', function () {
        return __awaiter(this, void 0, void 0, function* () {
            {
                const user = yield (0, testUtils_1.createUser)(1);
                const scheduleTime = Date.now() + 1000;
                yield (0, testUtils_1.models)().userDeletion().add(user.id, scheduleTime);
                const deletion = yield (0, testUtils_1.models)().userDeletion().byUserId(user.id);
                expect(deletion.user_id).toBe(user.id);
                expect(deletion.process_account).toBe(1);
                expect(deletion.process_data).toBe(1);
                expect(deletion.scheduled_time).toBe(scheduleTime);
                expect(deletion.error).toBe('');
                expect(deletion.success).toBe(0);
                expect(deletion.start_time).toBe(0);
                expect(deletion.end_time).toBe(0);
                yield (0, testUtils_1.models)().userDeletion().delete(deletion.id);
            }
            {
                const user = yield (0, testUtils_1.createUser)(2);
                yield (0, testUtils_1.models)().userDeletion().add(user.id, Date.now() + 1000, {
                    processData: true,
                    processAccount: false,
                });
                const deletion = yield (0, testUtils_1.models)().userDeletion().byUserId(user.id);
                expect(deletion.process_data).toBe(1);
                expect(deletion.process_account).toBe(0);
            }
            {
                const user = yield (0, testUtils_1.createUser)(3);
                yield (0, testUtils_1.models)().userDeletion().add(user.id, Date.now() + 1000);
                yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().userDeletion().add(user.id, Date.now() + 1000); }));
            }
        });
    });
    test('should provide the next deletion operation', function () {
        return __awaiter(this, void 0, void 0, function* () {
            expect(yield (0, testUtils_1.models)().userDeletion().next()).toBeFalsy();
            jest.useFakeTimers();
            const t0 = new Date('2021-12-14').getTime();
            jest.setSystemTime(t0);
            const user1 = yield (0, testUtils_1.createUser)(1);
            const user2 = yield (0, testUtils_1.createUser)(2);
            yield (0, testUtils_1.models)().userDeletion().add(user1.id, t0 + 100000);
            yield (0, testUtils_1.models)().userDeletion().add(user2.id, t0 + 100);
            expect(yield (0, testUtils_1.models)().userDeletion().next()).toBeFalsy();
            jest.setSystemTime(t0 + 200);
            expect((yield (0, testUtils_1.models)().userDeletion().next()).user_id).toBe(user2.id);
            jest.setSystemTime(t0 + 200000);
            const next1 = yield (0, testUtils_1.models)().userDeletion().next();
            expect(next1.user_id).toBe(user2.id);
            yield (0, testUtils_1.models)().userDeletion().start(next1.id);
            yield (0, testUtils_1.models)().userDeletion().end(next1.id, true, null);
            const next2 = yield (0, testUtils_1.models)().userDeletion().next();
            expect(next2.user_id).toBe(user1.id);
            yield (0, testUtils_1.models)().userDeletion().start(next2.id);
            yield (0, testUtils_1.models)().userDeletion().end(next2.id, true, null);
            const next3 = yield (0, testUtils_1.models)().userDeletion().next();
            expect(next3).toBeFalsy();
            jest.useRealTimers();
        });
    });
    test('should start and stop deletion jobs', function () {
        return __awaiter(this, void 0, void 0, function* () {
            jest.useFakeTimers();
            const t0 = new Date('2021-12-14').getTime();
            jest.setSystemTime(t0);
            const user1 = yield (0, testUtils_1.createUser)(1);
            const user2 = yield (0, testUtils_1.createUser)(2);
            yield (0, testUtils_1.models)().userDeletion().add(user1.id, t0 + 10);
            yield (0, testUtils_1.models)().userDeletion().add(user2.id, t0 + 100);
            jest.setSystemTime(t0 + 200);
            const next1 = yield (0, testUtils_1.models)().userDeletion().next();
            yield (0, testUtils_1.models)().userDeletion().start(next1.id);
            {
                const d = yield (0, testUtils_1.models)().userDeletion().load(next1.id);
                expect(d.start_time).toBe(t0 + 200);
                expect(d.updated_time).toBe(t0 + 200);
                expect(d.end_time).toBe(0);
            }
            jest.setSystemTime(t0 + 300);
            yield (0, testUtils_1.models)().userDeletion().end(next1.id, false, 'error!');
            {
                const d = yield (0, testUtils_1.models)().userDeletion().load(next1.id);
                expect(d.start_time).toBe(t0 + 200);
                expect(d.updated_time).toBe(t0 + 300);
                expect(d.end_time).toBe(t0 + 300);
                expect(d.success).toBe(0);
                expect(JSON.parse(d.error)).toEqual({ message: 'error!' });
            }
            const next2 = yield (0, testUtils_1.models)().userDeletion().next();
            yield (0, testUtils_1.models)().userDeletion().start(next2.id);
            yield (0, testUtils_1.models)().userDeletion().end(next2.id, true, null);
            {
                const d = yield (0, testUtils_1.models)().userDeletion().load(next2.id);
                expect(d.start_time).toBe(t0 + 300);
                expect(d.updated_time).toBe(t0 + 300);
                expect(d.end_time).toBe(t0 + 300);
                expect(d.success).toBe(1);
                expect(d.error).toBe('');
            }
            jest.useRealTimers();
        });
    });
    test('should auto-add users for deletion', function () {
        return __awaiter(this, void 0, void 0, function* () {
            jest.useFakeTimers();
            const t0 = new Date('2022-02-22').getTime();
            jest.setSystemTime(t0);
            yield (0, testUtils_1.createUser)(1);
            const user2 = yield (0, testUtils_1.createUser)(2);
            yield (0, testUtils_1.models)().user().save({
                id: user2.id,
                enabled: 0,
                disabled_time: t0,
            });
            yield (0, testUtils_1.models)().userDeletion().autoAdd(10, 90 * time_1.Day, t0 + 3 * time_1.Day);
            expect(yield (0, testUtils_1.models)().userDeletion().count()).toBe(0);
            const t1 = new Date('2022-05-30').getTime();
            jest.setSystemTime(t1);
            yield (0, testUtils_1.models)().userDeletion().autoAdd(10, 90 * time_1.Day, t1 + 3 * time_1.Day);
            expect(yield (0, testUtils_1.models)().userDeletion().count()).toBe(1);
            const d = (yield (0, testUtils_1.models)().userDeletion().all())[0];
            expect(d.user_id).toBe(user2.id);
            expect(d.scheduled_time).toBe(t1 + 3 * time_1.Day);
            // Shouldn't add it again if running autoAdd() again
            yield (0, testUtils_1.models)().userDeletion().autoAdd(10, 90 * time_1.Day, t1 + 3 * time_1.Day);
            expect(yield (0, testUtils_1.models)().userDeletion().count()).toBe(1);
            jest.useRealTimers();
        });
    });
});
//# sourceMappingURL=UserDeletionModel.test.js.map