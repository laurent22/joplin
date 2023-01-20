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
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
const testUtils_1 = require("../utils/testing/testUtils");
const apiVersionHandler_1 = require("./apiVersionHandler");
describe('apiVersionHandler', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('apiVersionHandler');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should work if no version header is provided', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield (0, testUtils_1.koaAppContext)({});
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiVersionHandler_1.default)(context, testUtils_1.koaNext); }));
        });
    });
    test('should work if the header version number is lower than the server version', function () {
        return __awaiter(this, void 0, void 0, function* () {
            (0, config_1.default)().appVersion = '2.1.0';
            const context = yield (0, testUtils_1.koaAppContext)({
                request: {
                    method: 'GET',
                    url: '/api/ping',
                    headers: {
                        'x-api-min-version': '2.0.0',
                    },
                },
            });
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiVersionHandler_1.default)(context, testUtils_1.koaNext); }));
        });
    });
    test('should not work if the header version number is greater than the server version', function () {
        return __awaiter(this, void 0, void 0, function* () {
            (0, config_1.default)().appVersion = '2.1.0';
            const context = yield (0, testUtils_1.koaAppContext)({
                request: {
                    method: 'GET',
                    url: '/api/ping',
                    headers: {
                        'x-api-min-version': '2.2.0',
                    },
                },
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiVersionHandler_1.default)(context, testUtils_1.koaNext); }), errors_1.ErrorPreconditionFailed.httpCode);
        });
    });
});
//# sourceMappingURL=apiVersionHandler.test.js.map