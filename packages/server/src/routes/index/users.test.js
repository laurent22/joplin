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
const routeHandler_1 = require("../../middleware/routeHandler");
const NotificationModel_1 = require("../../models/NotificationModel");
const cookies_1 = require("../../utils/cookies");
const errors_1 = require("../../utils/errors");
const apiUtils_1 = require("../../utils/testing/apiUtils");
const testUtils_1 = require("../../utils/testing/testUtils");
const uuidgen_1 = require("../../utils/uuidgen");
function postUser(sessionId, email, password = null, props = null) {
    return __awaiter(this, void 0, void 0, function* () {
        password = password === null ? (0, uuidgen_1.default)() : password;
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'POST',
                url: '/admin/users/new',
                body: Object.assign({ email: email, password: password, password2: password, post_button: true }, props),
            },
        });
        yield (0, routeHandler_1.default)(context);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
function patchUser(sessionId, user, url = '') {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'POST',
                url: url ? url : '/users',
                body: Object.assign(Object.assign({}, user), { post_button: true }),
            },
        });
        yield (0, routeHandler_1.default)(context);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
function getUserHtml(sessionId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'GET',
                url: `/users/${userId}`,
            },
        });
        yield (0, routeHandler_1.default)(context);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
describe('index/users', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index_users');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('new user should be able to login', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const password = (0, uuidgen_1.default)();
            yield postUser(session.id, 'test@example.com', password);
            const loggedInUser = yield (0, testUtils_1.models)().user().login('test@example.com', password);
            expect(!!loggedInUser).toBe(true);
            expect(loggedInUser.email).toBe('test@example.com');
        });
    });
    test('should change user properties', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)(1, false);
            const userModel = (0, testUtils_1.models)().user();
            yield patchUser(session.id, { id: user.id, full_name: 'new name' });
            const modUser = yield userModel.load(user.id);
            expect(modUser.full_name).toBe('new name');
        });
    });
    test('should change the password', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const userModel = (0, testUtils_1.models)().user();
            const password = (0, uuidgen_1.default)();
            yield patchUser(session.id, { id: user.id, password: password, password2: password });
            const modUser = yield userModel.login('user1@localhost', password);
            expect(!!modUser).toBe(true);
            expect(modUser.id).toBe(user.id);
        });
    });
    test('should get a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)();
            const userHtml = yield getUserHtml(session.id, user.id);
            const doc = (0, testUtils_1.parseHtml)(userHtml);
            // <input class="input" type="email" name="email" value="user1@localhost"/>
            expect(doc.querySelector('input[name=email]').value).toBe('user1@localhost');
        });
    });
    test('should allow user to set a password for new accounts', function () {
        return __awaiter(this, void 0, void 0, function* () {
            let user1 = yield (0, testUtils_1.models)().user().save({
                email: 'user1@localhost',
                must_set_password: 1,
                email_confirmed: 0,
                password: (0, uuidgen_1.default)(),
            });
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const email = (yield (0, testUtils_1.models)().email().all()).find(e => e.recipient_id === user1.id);
            const matches = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
            const path = matches[1];
            const token = matches[3];
            // Check that the email at first is not confirmed
            // expect(user1.email_confirmed).toBe(0);
            // expect(user1.must_set_password).toBe(1);
            yield (0, apiUtils_1.execRequest)('', 'GET', path, null, { query: { token } });
            // As soon as the confirmation page is opened, we know the email is valid
            user1 = yield (0, testUtils_1.models)().user().load(user1.id);
            expect(user1.email_confirmed).toBe(1);
            // Check that the token is valid
            expect(yield (0, testUtils_1.models)().token().isValid(user1.id, token)).toBe(true);
            // Check that we can't set the password without the token
            {
                const newPassword = (0, uuidgen_1.default)();
                const context = yield (0, apiUtils_1.execRequestC)('', 'POST', path, {
                    password: newPassword,
                    password2: newPassword,
                });
                const sessionId = (0, cookies_1.cookieGet)(context, 'sessionId');
                expect(sessionId).toBeFalsy();
            }
            // Check that we can't set the password with someone else's token
            {
                const newPassword = (0, uuidgen_1.default)();
                const token2 = (yield (0, testUtils_1.models)().token().allByUserId(user2.id))[0].value;
                const context = yield (0, apiUtils_1.execRequestC)('', 'POST', path, {
                    password: newPassword,
                    password2: newPassword,
                    token: token2,
                });
                const sessionId = (0, cookies_1.cookieGet)(context, 'sessionId');
                expect(sessionId).toBeFalsy();
            }
            const newPassword = (0, uuidgen_1.default)();
            const context = yield (0, apiUtils_1.execRequestC)('', 'POST', path, {
                password: newPassword,
                password2: newPassword,
                token: token,
            });
            // Check that the user has been logged in
            const sessionId = (0, cookies_1.cookieGet)(context, 'sessionId');
            const session = yield (0, testUtils_1.models)().session().load(sessionId);
            expect(session.user_id).toBe(user1.id);
            // Check that the password has been set
            const loggedInUser = yield (0, testUtils_1.models)().user().login(user1.email, newPassword);
            expect(loggedInUser.id).toBe(user1.id);
            // Check that the email has been verified
            expect(user1.email_confirmed).toBe(1);
            // Check that the token has been cleared
            expect(yield (0, testUtils_1.models)().token().isValid(user1.id, token)).toBe(false);
            // Check that a notification has been created
            const notification = (yield (0, testUtils_1.models)().notification().all())[0];
            expect(notification.key).toBe('passwordSet');
        });
    });
    test('should not confirm email if not requested', function () {
        return __awaiter(this, void 0, void 0, function* () {
            let user1 = yield (0, testUtils_1.models)().user().save({
                email: 'user1@localhost',
                must_set_password: 1,
                email_confirmed: 0,
                password: (0, uuidgen_1.default)(),
            });
            const email = (yield (0, testUtils_1.models)().email().all()).find(e => e.recipient_id === user1.id);
            const matches = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
            const path = matches[1];
            const token = matches[3];
            yield (0, apiUtils_1.execRequest)('', 'GET', path, null, { query: { token, confirm_email: '0' } });
            // In this case, the email should not be confirmed, because
            // "confirm_email" is set to 0.
            user1 = yield (0, testUtils_1.models)().user().load(user1.id);
            expect(user1.email_confirmed).toBe(0);
        });
    });
    test('should allow user to verify their email', function () {
        return __awaiter(this, void 0, void 0, function* () {
            let user1 = yield (0, testUtils_1.models)().user().save({
                email: 'user1@localhost',
                must_set_password: 0,
                email_confirmed: 0,
                password: (0, uuidgen_1.default)(),
            });
            const email = (yield (0, testUtils_1.models)().email().all()).find(e => e.recipient_id === user1.id);
            const [, path, , token] = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
            // const path = matches[1];
            // const token = matches[3];
            const context = yield (0, apiUtils_1.execRequestC)('', 'GET', path, null, { query: { token } });
            user1 = yield (0, testUtils_1.models)().user().load(user1.id);
            // Check that the user has been logged in
            const sessionId = (0, cookies_1.cookieGet)(context, 'sessionId');
            expect(sessionId).toBeFalsy();
            // Check that the email has been verified
            expect(user1.email_confirmed).toBe(1);
            // Check that the token has been cleared
            expect(yield (0, testUtils_1.models)().token().isValid(user1.id, token)).toBe(false);
            // Check that a notification has been created
            const notification = (yield (0, testUtils_1.models)().notification().all())[0];
            expect(notification.key).toBe(NotificationModel_1.NotificationKey.EmailConfirmed);
        });
    });
    test('should allow changing an email', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)();
            yield patchUser(session.id, {
                id: user.id,
                email: 'changed@example.com',
            }, '/users/me');
            // It's not immediately changed
            expect((yield (0, testUtils_1.models)().user().load(user.id)).email).toBe('user1@localhost');
            // Grab the confirmation URL
            const email = (yield (0, testUtils_1.models)().email().all()).find(e => e.recipient_id === user.id);
            const [, path, , token] = email.body.match(/\/(users\/.*)(\?token=)(.{32})/);
            yield (0, apiUtils_1.execRequest)('', 'GET', path, null, { query: { token } });
            // Now that it's confirmed, it should have been changed
            expect((yield (0, testUtils_1.models)().user().load(user.id)).email).toBe('changed@example.com');
            const keys = yield (0, testUtils_1.models)().keyValue().all();
            expect(keys.length).toBe(1);
            expect(keys[0].value).toBe('user1@localhost'); // The old email has been saved
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.execRequest)('', 'GET', path, null, { query: { token } }); }));
        });
    });
    test('should not change non-whitelisted properties', () => __awaiter(this, void 0, void 0, function* () {
        const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(2, false);
        yield patchUser(session1.id, {
            id: user1.id,
            is_admin: 1,
            max_item_size: 555,
            max_total_item_size: 5555,
            can_share_folder: 1,
            can_upload: 0,
        });
        const reloadedUser1 = yield (0, testUtils_1.models)().user().load(user1.id);
        expect(reloadedUser1.is_admin).toBe(0);
        expect(reloadedUser1.max_item_size).toBe(null);
        expect(reloadedUser1.max_total_item_size).toBe(null);
        expect(reloadedUser1.can_share_folder).toBe(null);
        expect(reloadedUser1.can_upload).toBe(1);
    }));
    test('should apply ACL', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: admin } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(2, false);
            // non-admin cannot list users
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.execRequest)(session1.id, 'GET', 'admin/users'); }), errors_1.ErrorForbidden.httpCode);
            // non-admin user cannot view another user
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.execRequest)(session1.id, 'GET', `users/${admin.id}`); }), errors_1.ErrorForbidden.httpCode);
            // non-admin user cannot create a new user
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return postUser(session1.id, 'cantdothat@example.com'); }), errors_1.ErrorForbidden.httpCode);
            // non-admin user cannot update another user
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return patchUser(session1.id, { id: admin.id, email: 'cantdothateither@example.com' }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
});
//# sourceMappingURL=users.test.js.map