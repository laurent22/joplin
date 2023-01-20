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
const apiUtils_1 = require("../../utils/testing/apiUtils");
const testUtils_1 = require("../../utils/testing/testUtils");
const uuidgen_1 = require("../../utils/uuidgen");
const errors_1 = require("../../utils/errors");
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
                url: url ? url : '/admin/users',
                body: Object.assign(Object.assign({}, user), { post_button: true }),
            },
        });
        yield (0, routeHandler_1.default)(context);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
describe('admin/users', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('admin/users');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create a new user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const password = (0, uuidgen_1.default)();
            yield postUser(session.id, 'test@example.com', password, {
                max_item_size: '',
            });
            const newUser = yield (0, testUtils_1.models)().user().loadByEmail('test@example.com');
            expect(!!newUser).toBe(true);
            expect(!!newUser.id).toBe(true);
            expect(!!newUser.is_admin).toBe(false);
            expect(!!newUser.email).toBe(true);
            expect(newUser.max_item_size).toBe(null);
            expect(newUser.must_set_password).toBe(0);
            const userModel = (0, testUtils_1.models)().user();
            const userFromModel = yield userModel.load(newUser.id);
            expect(!!userFromModel.password).toBe(true);
            expect(userFromModel.password === password).toBe(false); // Password has been hashed
        });
    });
    test('should create a user with null properties if they are not explicitly set', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            yield postUser(session.id, 'test@example.com');
            const newUser = yield (0, testUtils_1.models)().user().loadByEmail('test@example.com');
            expect(newUser.max_item_size).toBe(null);
            expect(newUser.can_share_folder).toBe(null);
            expect(newUser.can_share_note).toBe(null);
            expect(newUser.max_total_item_size).toBe(null);
        });
    });
    test('should ask user to set password if not set on creation', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            yield postUser(session.id, 'test@example.com', '', {
                max_item_size: '',
            });
            const newUser = yield (0, testUtils_1.models)().user().loadByEmail('test@example.com');
            expect(newUser.must_set_password).toBe(1);
            expect(!!newUser.password).toBe(true);
        });
    });
    test('should format the email when saving it', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const email = 'ILikeUppercaseAndSpaces@Example.COM   ';
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const password = (0, uuidgen_1.default)();
            yield postUser(session.id, email, password);
            const loggedInUser = yield (0, testUtils_1.models)().user().login(email, password);
            expect(!!loggedInUser).toBe(true);
            expect(loggedInUser.email).toBe('ilikeuppercaseandspaces@example.com');
        });
    });
    test('should not create anything if user creation fail', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const userModel = (0, testUtils_1.models)().user();
            const password = (0, uuidgen_1.default)();
            yield postUser(session.id, 'test@example.com', password);
            const beforeUserCount = (yield userModel.all()).length;
            expect(beforeUserCount).toBe(2);
            try {
                yield postUser(session.id, 'test@example.com', password);
            }
            catch (_a) {
                // Ignore
            }
            const afterUserCount = (yield userModel.all()).length;
            expect(beforeUserCount).toBe(afterUserCount);
        });
    });
    test('should list users', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2, false);
            const result = yield (0, apiUtils_1.execRequest)(session1.id, 'GET', 'admin/users');
            expect(result).toContain(user1.email);
            expect(result).toContain(user2.email);
        });
    });
    test('should delete sessions when changing password', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session, password } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            expect(yield (0, testUtils_1.models)().session().count()).toBe(4);
            yield patchUser(session.id, {
                id: user.id,
                email: 'changed@example.com',
                password: '111111',
                password2: '111111',
            }, '/admin/users/me');
            const sessions = yield (0, testUtils_1.models)().session().all();
            expect(sessions.length).toBe(1);
            expect(sessions[0].id).toBe(session.id);
        });
    });
    test('should apply ACL', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: admin, session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            // admin user cannot make themselves a non-admin
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return patchUser(adminSession.id, { id: admin.id, is_admin: 0 }); }), errors_1.ErrorForbidden.httpCode);
            // cannot delete own user
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.execRequest)(adminSession.id, 'POST', `admin/users/${admin.id}`, { disable_button: true }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
});
//# sourceMappingURL=users.test.js.map