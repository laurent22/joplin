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
const types_1 = require("../services/database/types");
const db_1 = require("../db");
const notificationHandler_1 = require("./notificationHandler");
const runNotificationHandler = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const context = yield (0, testUtils_1.koaAppContext)({ sessionId: sessionId });
    yield (0, notificationHandler_1.default)(context, testUtils_1.koaNext);
    return context;
});
describe('notificationHandler', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('notificationHandler');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should check admin password', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, testUtils_1.createUserAndSession)(1, true);
            const session = r.session;
            let admin = r.user;
            // The default admin password actually doesn't pass the complexity
            // check, so we need to skip validation for testing here. Eventually, a
            // better mechanism to set the initial default admin password should
            // probably be implemented.
            admin = yield (0, testUtils_1.models)().user().save({
                id: admin.id,
                email: db_1.defaultAdminEmail,
                password: db_1.defaultAdminPassword,
                is_admin: 1,
                email_confirmed: 1,
            }, { skipValidation: true });
            {
                const ctx = yield runNotificationHandler(session.id);
                const notifications = yield (0, testUtils_1.models)().notification().all();
                expect(notifications.length).toBe(1);
                expect(notifications[0].key).toBe('change_admin_password');
                expect(notifications[0].read).toBe(0);
                expect(ctx.joplin.notifications.length).toBe(1);
            }
            {
                yield (0, testUtils_1.models)().user().save({
                    id: admin.id,
                    password: 'changed!',
                }, { skipValidation: true });
                const ctx = yield runNotificationHandler(session.id);
                const notifications = yield (0, testUtils_1.models)().notification().all();
                expect(notifications.length).toBe(1);
                expect(notifications[0].key).toBe('change_admin_password');
                expect(notifications[0].read).toBe(1);
                expect(ctx.joplin.notifications.length).toBe(0);
            }
        });
    });
    test('should not check admin password for non-admin', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, false);
            yield (0, testUtils_1.createUserAndSession)(2, true, {
                email: db_1.defaultAdminEmail,
                password: db_1.defaultAdminPassword,
            });
            yield runNotificationHandler(session.id);
            const notifications = yield (0, testUtils_1.models)().notification().all();
            expect(notifications.length).toBe(0);
        });
    });
    test('should display a banner if the account is disabled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session, user } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().userFlag().add(user.id, types_1.UserFlagType.FailedPaymentFinal);
            const ctx = yield runNotificationHandler(session.id);
            expect(ctx.joplin.notifications.find(v => v.id === 'accountDisabled')).toBeTruthy();
        });
    });
    test('should display a banner if the email is not confirmed', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session, user } = yield (0, testUtils_1.createUserAndSession)(1);
            {
                const ctx = yield runNotificationHandler(session.id);
                expect(ctx.joplin.notifications.find(v => v.id === 'confirmEmail')).toBeTruthy();
            }
            {
                yield (0, testUtils_1.models)().user().save({ id: user.id, email_confirmed: 1 });
                const ctx = yield runNotificationHandler(session.id);
                expect(ctx.joplin.notifications.find(v => v.id === 'confirmEmail')).toBeFalsy();
            }
        });
    });
});
//# sourceMappingURL=notificationHandler.test.js.map