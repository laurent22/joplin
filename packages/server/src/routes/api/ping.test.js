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
describe('api_ping', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('api_ping');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should ping', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield (0, testUtils_1.koaAppContext)({
                request: {
                    url: '/api/ping',
                },
            });
            yield (0, routeHandler_1.default)(context);
            const body = context.response.body;
            expect(context.response.status).toBe(200);
            expect(body.status).toBe('ok');
            expect(body.message).toBe('Joplin Server is running');
        });
    });
});
//# sourceMappingURL=ping.test.js.map