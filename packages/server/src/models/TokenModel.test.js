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
const testUtils_1 = require("../utils/testing/testUtils");
describe('TokenModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('TokenModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should delete old tokens', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().token().generate(user1.id);
            const [token1, token2] = yield (0, testUtils_1.models)().token().all();
            yield (0, testUtils_1.models)().token().save({ id: token1.id, created_time: Date.now() - 2629746000 });
            yield (0, testUtils_1.models)().token().deleteExpiredTokens();
            const tokens = yield (0, testUtils_1.models)().token().all();
            expect(tokens.length).toBe(1);
            expect(tokens[0].id).toBe(token2.id);
        });
    });
});
//# sourceMappingURL=TokenModel.test.js.map