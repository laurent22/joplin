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
describe('index/home', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index/home');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should show the home page', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)();
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: session.id,
                request: {
                    method: 'GET',
                    url: '/home',
                },
            });
            yield (0, routeHandler_1.default)(context);
            expect(context.response.body.indexOf(user.email) >= 0).toBe(true);
        });
    });
});
//# sourceMappingURL=home.test.js.map