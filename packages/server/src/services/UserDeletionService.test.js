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
const config_1 = require("../config");
const shareApiUtils_1 = require("../utils/testing/shareApiUtils");
const testUtils_1 = require("../utils/testing/testUtils");
const types_1 = require("../utils/types");
const types_2 = require("./database/types");
const UserDeletionService_1 = require("./UserDeletionService");
const newService = () => {
    return new UserDeletionService_1.default(types_1.Env.Dev, (0, testUtils_1.models)(), (0, config_1.default)());
};
describe('UserDeletionService', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('UserDeletionService');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should delete user data', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.createNote)(session1.id, { title: 'testing1' });
            yield (0, testUtils_1.createNote)(session2.id, { title: 'testing2' });
            const t0 = new Date('2021-12-14').getTime();
            const t1 = t0 + 1000;
            yield (0, testUtils_1.models)().userFlag().toggle(user1.id, types_2.UserFlagType.ManuallyDisabled, true);
            const job = yield (0, testUtils_1.models)().userDeletion().add(user1.id, t1, {
                processData: true,
                processAccount: false,
            });
            expect(yield (0, testUtils_1.models)().item().count()).toBe(2);
            expect(yield (0, testUtils_1.models)().change().count()).toBe(2);
            const service = newService();
            yield service.processDeletionJob(job, { sleepBetweenOperations: 0 });
            expect(yield (0, testUtils_1.models)().item().count()).toBe(1);
            expect(yield (0, testUtils_1.models)().change().count()).toBe(1);
            const item = (yield (0, testUtils_1.models)().item().all())[0];
            expect(item.owner_id).toBe(user2.id);
            const change = (yield (0, testUtils_1.models)().change().all())[0];
            expect(change.user_id).toBe(user2.id);
            expect(yield (0, testUtils_1.models)().user().count()).toBe(2);
            expect(yield (0, testUtils_1.models)().session().count()).toBe(2);
        });
    });
    test('should delete user account', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const t0 = new Date('2021-12-14').getTime();
            const t1 = t0 + 1000;
            yield (0, testUtils_1.models)().userFlag().toggle(user1.id, types_2.UserFlagType.ManuallyDisabled, true);
            const job = yield (0, testUtils_1.models)().userDeletion().add(user1.id, t1, {
                processData: false,
                processAccount: true,
            });
            expect(yield (0, testUtils_1.models)().user().count()).toBe(2);
            expect(yield (0, testUtils_1.models)().session().count()).toBe(2);
            const beforeTime = Date.now();
            const service = newService();
            yield service.processDeletionJob(job, { sleepBetweenOperations: 0 });
            expect(yield (0, testUtils_1.models)().user().count()).toBe(1);
            expect(yield (0, testUtils_1.models)().session().count()).toBe(1);
            const user = (yield (0, testUtils_1.models)().user().all())[0];
            expect(user.id).toBe(user2.id);
            const backupItems = yield (0, testUtils_1.models)().backupItem().all();
            expect(backupItems.length).toBe(1);
            const backupItem = backupItems[0];
            expect(backupItem.key).toBe(user1.email);
            expect(backupItem.type).toBe(types_2.BackupItemType.UserAccount);
            expect(backupItem.created_time).toBeGreaterThanOrEqual(beforeTime);
            const content = JSON.parse(backupItem.content.toString());
            expect(content.user.id).toBe(user1.id);
            expect(content.user.email).toBe(user1.email);
            expect(content.flags.length).toBe(1);
        });
    });
    test('should not delete notebooks that are not owned', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F2', [
                {
                    id: '000000000000000000000000000000F2',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            expect(yield (0, testUtils_1.models)().share().count()).toBe(1);
            expect(yield (0, testUtils_1.models)().shareUser().count()).toBe(1);
            yield (0, testUtils_1.models)().userFlag().toggle(user2.id, types_2.UserFlagType.ManuallyDisabled, true);
            const job = yield (0, testUtils_1.models)().userDeletion().add(user2.id, Date.now());
            const service = newService();
            yield service.processDeletionJob(job, { sleepBetweenOperations: 0 });
            expect(yield (0, testUtils_1.models)().share().count()).toBe(1); // The share object has not (and should not) been deleted
            expect(yield (0, testUtils_1.models)().shareUser().count()).toBe(0); // However all the invitations are gone
            expect(yield (0, testUtils_1.models)().item().count()).toBe(2);
        });
    });
    test('should not delete notebooks that are owned', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F2', [
                {
                    id: '000000000000000000000000000000F2',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            expect(yield (0, testUtils_1.models)().share().count()).toBe(1);
            expect(yield (0, testUtils_1.models)().shareUser().count()).toBe(1);
            yield (0, testUtils_1.models)().userFlag().toggle(user1.id, types_2.UserFlagType.ManuallyDisabled, true);
            const job = yield (0, testUtils_1.models)().userDeletion().add(user1.id, Date.now());
            const service = newService();
            yield service.processDeletionJob(job, { sleepBetweenOperations: 0 });
            expect(yield (0, testUtils_1.models)().share().count()).toBe(0);
            expect(yield (0, testUtils_1.models)().shareUser().count()).toBe(0);
            expect(yield (0, testUtils_1.models)().item().count()).toBe(0);
        });
    });
    test('should not do anything if the user is still enabled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const t0 = new Date('2021-12-14').getTime();
            const t1 = t0 + 1000;
            const job = yield (0, testUtils_1.models)().userDeletion().add(user1.id, t1, {
                processData: false,
                processAccount: true,
            });
            expect(yield (0, testUtils_1.models)().userDeletion().count()).toBe(1);
            const service = newService();
            yield service.processDeletionJob(job, { sleepBetweenOperations: 0 });
            // Nothing has been done because the user is still enabled
            expect(yield (0, testUtils_1.models)().user().count()).toBe(1);
            // And the job should have been removed from the queue
            expect(yield (0, testUtils_1.models)().userDeletion().count()).toBe(0);
        });
    });
});
//# sourceMappingURL=UserDeletionService.test.js.map