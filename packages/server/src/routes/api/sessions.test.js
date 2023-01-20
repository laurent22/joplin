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
const testUtils_1 = require("../../utils/testing/testUtils");
function postSession(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            request: {
                method: 'POST',
                url: '/api/sessions',
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
describe('api/sessions', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('api/sessions');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should login user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, password } = yield (0, testUtils_1.createUserAndSession)(1, false);
            const context = yield postSession(user.email, password);
            expect(context.response.status).toBe(200);
            expect(!!context.response.body.id).toBe(true);
            const session = yield (0, testUtils_1.models)().session().load(context.response.body.id);
            expect(session.user_id).toBe(user.id);
        });
    });
    test('should not login user with wrong password', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1, false);
            {
                const context = yield postSession(user.email, 'wrong');
                expect(context.response.status).toBe(403);
            }
            {
                const context = yield postSession('wrong@wrong.com', '123456');
                expect(context.response.status).toBe(403);
            }
            {
                const context = yield postSession('', '');
                expect(context.response.status).toBe(403);
            }
        });
    });
});
//# sourceMappingURL=sessions.test.js.map