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
const cookies_1 = require("../../utils/cookies");
const testUtils_1 = require("../../utils/testing/testUtils");
function doLogin(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            request: {
                method: 'POST',
                url: '/login',
                body: {
                    email: email,
                    password: password,
                },
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
describe('index_login', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index_login');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should show the login page', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield (0, testUtils_1.koaAppContext)({
                request: {
                    method: 'GET',
                    url: '/login',
                },
            });
            yield (0, routeHandler_1.default)(context);
            const doc = (0, testUtils_1.parseHtml)(context.response.body);
            expect(!!doc.querySelector('input[name=email]')).toBe(true);
            expect(!!doc.querySelector('input[name=password]')).toBe(true);
        });
    });
    test('should login', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield (0, testUtils_1.createUser)(1);
            const context = yield doLogin(user.email, '123456');
            const sessionId = (0, cookies_1.cookieGet)(context, 'sessionId');
            const session = yield (0, testUtils_1.models)().session().load(sessionId);
            expect(session.user_id).toBe(user.id);
        });
    });
    test('should not login with invalid credentials', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield (0, testUtils_1.createUser)(1);
            {
                const context = yield doLogin('bad', '123456');
                expect(!(0, cookies_1.cookieGet)(context, 'sessionId')).toBe(true);
            }
            {
                const context = yield doLogin(user.email, 'bad');
                expect(!(0, cookies_1.cookieGet)(context, 'sessionId')).toBe(true);
            }
        });
    });
});
//# sourceMappingURL=login.test.js.map