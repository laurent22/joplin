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
const errors_1 = require("../utils/errors");
const testUtils_1 = require("../utils/testing/testUtils");
const checkAdminHandler_1 = require("./checkAdminHandler");
describe('checkAdminHandler', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('checkAdminHandler');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should access /admin if the user is admin', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: session.id,
                request: {
                    method: 'GET',
                    url: '/admin/organizations',
                },
            });
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, checkAdminHandler_1.default)(context, testUtils_1.koaNext); }));
        });
    });
    test('should not access /admin if the user is not admin', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1);
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: session.id,
                request: {
                    method: 'GET',
                    url: '/admin/organizations',
                },
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, checkAdminHandler_1.default)(context, testUtils_1.koaNext); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should not access /admin if the user is not logged in', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield (0, testUtils_1.koaAppContext)({
                request: {
                    method: 'GET',
                    url: '/admin/organizations',
                },
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, checkAdminHandler_1.default)(context, testUtils_1.koaNext); }), errors_1.ErrorForbidden.httpCode);
        });
    });
});
//# sourceMappingURL=checkAdminHandler.test.js.map