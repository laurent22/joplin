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
describe('index_logout', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index_logout');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should logout', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: session.id,
                request: {
                    method: 'POST',
                    url: '/logout',
                },
            });
            expect((0, cookies_1.cookieGet)(context, 'sessionId')).toBe(session.id);
            expect(!!(yield (0, testUtils_1.models)().session().load(session.id))).toBe(true);
            yield (0, routeHandler_1.default)(context);
            expect(!(0, cookies_1.cookieGet)(context, 'sessionId')).toBe(true);
            expect(!!(yield (0, testUtils_1.models)().session().load(session.id))).toBe(false);
        });
    });
});
//# sourceMappingURL=logout.test.js.map