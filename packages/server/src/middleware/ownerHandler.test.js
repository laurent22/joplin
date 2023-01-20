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
const ownerHandler_1 = require("./ownerHandler");
describe('ownerHandler', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('ownerHandler');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should login user with valid session ID', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)(1, false);
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: session.id,
            });
            context.joplin.owner = null;
            yield (0, ownerHandler_1.default)(context, testUtils_1.koaNext);
            expect(!!context.joplin.owner).toBe(true);
            expect(context.joplin.owner.id).toBe(user.id);
        });
    });
    test('should not login user with invalid session ID', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.createUserAndSession)(1, false);
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: 'ihack',
            });
            context.joplin.owner = null;
            yield (0, ownerHandler_1.default)(context, testUtils_1.koaNext);
            expect(!!context.joplin.owner).toBe(false);
        });
    });
});
//# sourceMappingURL=ownerHandler.test.js.map