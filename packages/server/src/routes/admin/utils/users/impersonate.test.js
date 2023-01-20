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
const testUtils_1 = require("../../../../utils/testing/testUtils");
const cookies_1 = require("../../../../utils/cookies");
const impersonate_1 = require("./impersonate");
describe('users/impersonate', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('users/impersonate');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should impersonate a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const ctx = yield (0, testUtils_1.koaAppContext)();
            const { user: adminUser, session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { user } = yield (0, testUtils_1.createUserAndSession)(2);
            (0, cookies_1.cookieSet)(ctx, 'sessionId', adminSession.id);
            yield (0, impersonate_1.startImpersonating)(ctx, user.id);
            {
                expect((0, cookies_1.cookieGet)(ctx, 'adminSessionId')).toBe(adminSession.id);
                const sessionUser = yield (0, testUtils_1.models)().session().sessionUser((0, cookies_1.cookieGet)(ctx, 'sessionId'));
                expect(sessionUser.id).toBe(user.id);
            }
            yield (0, impersonate_1.stopImpersonating)(ctx);
            {
                expect((0, cookies_1.cookieGet)(ctx, 'adminSessionId')).toBeFalsy();
                const sessionUser = yield (0, testUtils_1.models)().session().sessionUser((0, cookies_1.cookieGet)(ctx, 'sessionId'));
                expect(sessionUser.id).toBe(adminUser.id);
            }
        });
    });
    test('should not impersonate if not admin', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const ctx = yield (0, testUtils_1.koaAppContext)();
            const { user: adminUser } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { session } = yield (0, testUtils_1.createUserAndSession)(2);
            (0, cookies_1.cookieSet)(ctx, 'sessionId', session.id);
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, impersonate_1.startImpersonating)(ctx, adminUser.id); }));
        });
    });
    // test('should not stop impersonating if not admin', async function() {
    // 	const ctx = await koaAppContext();
    // 	await createUserAndSession(1, true);
    // 	const { session } = await createUserAndSession(2);
    // 	cookieSet(ctx, 'adminSessionId', session.id);
    // 	await expectThrow(async () => stopImpersonating(ctx));
    // });
});
//# sourceMappingURL=impersonate.test.js.map