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
const config_1 = require("../../config");
const UserModel_1 = require("../../models/UserModel");
const user_1 = require("../../models/utils/user");
const bytes_1 = require("../../utils/bytes");
const cookies_1 = require("../../utils/cookies");
const apiUtils_1 = require("../../utils/testing/apiUtils");
const testUtils_1 = require("../../utils/testing/testUtils");
const uuidgen_1 = require("../../utils/uuidgen");
describe('index_signup', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index_signup');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create a new account', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const password = (0, uuidgen_1.default)();
            const formUser = {
                full_name: 'Toto',
                email: 'toto@example.com',
                password: password,
                password2: password,
            };
            // First confirm that it doesn't work if sign up is disabled
            {
                (0, config_1.default)().signupEnabled = false;
                yield (0, apiUtils_1.execRequestC)('', 'POST', 'signup', formUser);
                expect(yield (0, testUtils_1.models)().user().loadByEmail('toto@example.com')).toBeFalsy();
            }
            (0, config_1.default)().signupEnabled = true;
            const context = yield (0, apiUtils_1.execRequestC)('', 'POST', 'signup', formUser);
            // Check that the user has been created
            const user = yield (0, testUtils_1.models)().user().loadByEmail('toto@example.com');
            expect(user).toBeTruthy();
            expect(user.account_type).toBe(UserModel_1.AccountType.Basic);
            expect(user.email_confirmed).toBe(0);
            expect((0, user_1.getCanShareFolder)(user)).toBe(0);
            expect((0, user_1.getMaxItemSize)(user)).toBe(10 * bytes_1.MB);
            // Check that the user is logged in
            const session = yield (0, testUtils_1.models)().session().load((0, cookies_1.cookieGet)(context, 'sessionId'));
            expect(session.user_id).toBe(user.id);
        });
    });
});
//# sourceMappingURL=signup.test.js.map