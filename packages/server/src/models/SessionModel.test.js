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
const SessionModel_1 = require("./SessionModel");
describe('SessionModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('SessionModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should delete expired sessions', function () {
        return __awaiter(this, void 0, void 0, function* () {
            jest.useFakeTimers();
            const t0 = new Date('2020-01-01T00:00:00').getTime();
            jest.setSystemTime(t0);
            const { user, password } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            jest.setSystemTime(new Date(t0 + SessionModel_1.defaultSessionTtl + 10));
            const lastSession = yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            expect(yield (0, testUtils_1.models)().session().count()).toBe(3);
            yield (0, testUtils_1.models)().session().deleteExpiredSessions();
            expect(yield (0, testUtils_1.models)().session().count()).toBe(1);
            expect((yield (0, testUtils_1.models)().session().all())[0].id).toBe(lastSession.id);
            yield (0, testUtils_1.models)().session().authenticate(user.email, password);
            yield (0, testUtils_1.models)().session().deleteExpiredSessions();
            expect(yield (0, testUtils_1.models)().session().count()).toBe(2);
            jest.useRealTimers();
        });
    });
});
//# sourceMappingURL=SessionModel.test.js.map