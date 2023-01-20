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
const testUtils_1 = require("../../utils/testing/testUtils");
const apiUtils_1 = require("../../utils/testing/apiUtils");
const uuidgen_1 = require("../../utils/uuidgen");
const errors_1 = require("../../utils/errors");
describe('index/password', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index/password');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should queue an email to reset password', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, password } = yield (0, testUtils_1.createUserAndSession)(1);
            // Create a few sessions, to verify that they are all deleted when the
            // password is changed.
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            expect(yield (0, testUtils_1.models)().session().count()).toBe(4);
            yield (0, testUtils_1.models)().email().deleteAll();
            yield (0, apiUtils_1.execRequest)('', 'POST', 'password/forgot', { email: user.email });
            const emails = yield (0, testUtils_1.models)().email().all();
            expect(emails.length).toBe(1);
            const match = emails[0].body.match(/(password\/reset)\?token=(.{32})/);
            expect(match).toBeTruthy();
            const newPassword = (0, uuidgen_1.default)();
            yield (0, apiUtils_1.execRequest)('', 'POST', match[1], {
                password: newPassword,
                password2: newPassword,
            }, { query: { token: match[2] } });
            const loggedInUser = yield (0, testUtils_1.models)().user().login(user.email, newPassword);
            expect(loggedInUser.id).toBe(user.id);
            // Check that all sessions have been deleted
            expect(yield (0, testUtils_1.models)().session().count()).toBe(0);
        });
    });
    test('should not queue an email for non-existing emails', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().email().deleteAll();
            yield (0, apiUtils_1.execRequest)('', 'POST', 'password/forgot', { email: 'justtryingtohackdontmindme@example.com' });
            expect((yield (0, testUtils_1.models)().email().all()).length).toBe(0);
        });
    });
    test('should not reset the password if the token is invalid', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().email().deleteAll();
            const newPassword = (0, uuidgen_1.default)();
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                yield (0, apiUtils_1.execRequest)('', 'POST', 'password/reset', {
                    password: newPassword,
                    password2: newPassword,
                }, { query: { token: 'stilltryingtohack' } });
            }), errors_1.ErrorNotFound.httpCode);
            const loggedInUser = yield (0, testUtils_1.models)().user().login(user.email, newPassword);
            expect(loggedInUser).toBeFalsy();
        });
    });
});
//# sourceMappingURL=password.test.js.map