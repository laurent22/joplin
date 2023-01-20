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
const testUtils_1 = require("./utils/testing/testUtils");
const env_1 = require("./env");
describe('env', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('env');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    it('should parse env values', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const result = (0, env_1.parseEnv)({
                DB_CLIENT: 'pg',
                POSTGRES_PORT: '123',
                MAILER_ENABLED: 'true',
                SIGNUP_ENABLED: 'false',
                TERMS_ENABLED: '0',
                ACCOUNT_TYPES_ENABLED: '1',
            });
            expect(result.DB_CLIENT).toBe('pg');
            expect(result.POSTGRES_PORT).toBe(123);
            expect(result.MAILER_ENABLED).toBe(true);
            expect(result.SIGNUP_ENABLED).toBe(false);
            expect(result.TERMS_ENABLED).toBe(false);
            expect(result.ACCOUNT_TYPES_ENABLED).toBe(true);
        });
    });
    it('should overrides default values', function () {
        return __awaiter(this, void 0, void 0, function* () {
            expect((0, env_1.parseEnv)({}).POSTGRES_USER).toBe('joplin');
            expect((0, env_1.parseEnv)({}, { POSTGRES_USER: 'other' }).POSTGRES_USER).toBe('other');
        });
    });
    it('should validate values', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, env_1.parseEnv)({ POSTGRES_PORT: 'notanumber' }); }));
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, env_1.parseEnv)({ MAILER_ENABLED: 'TRUE' }); }));
        });
    });
});
//# sourceMappingURL=env.test.js.map