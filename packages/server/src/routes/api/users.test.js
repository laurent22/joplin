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
const apiUtils_1 = require("../../utils/testing/apiUtils");
const testUtils_1 = require("../../utils/testing/testUtils");
describe('api_users', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('api_users');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const userToSave = {
                full_name: 'Toto',
                email: 'toto@example.com',
                max_item_size: 1000,
                can_share_folder: 0,
            };
            yield (0, apiUtils_1.postApi)(adminSession.id, 'users', userToSave);
            const savedUser = yield (0, testUtils_1.models)().user().loadByEmail('toto@example.com');
            expect(savedUser.full_name).toBe('Toto');
            expect(savedUser.email).toBe('toto@example.com');
            expect(savedUser.can_share_folder).toBe(0);
            expect(savedUser.max_item_size).toBe(1000);
            expect(savedUser.email_confirmed).toBe(0);
            expect(savedUser.must_set_password).toBe(1);
        });
    });
    test('should patch a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { user } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, apiUtils_1.patchApi)(adminSession.id, `users/${user.id}`, {
                max_item_size: 1000,
            });
            const savedUser = yield (0, testUtils_1.models)().user().load(user.id);
            expect(savedUser.max_item_size).toBe(1000);
        });
    });
    test('should get a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { user } = yield (0, testUtils_1.createUserAndSession)(2);
            const fetchedUser = yield (0, apiUtils_1.getApi)(adminSession.id, `users/${user.id}`);
            expect(fetchedUser.id).toBe(user.id);
            expect(fetchedUser.email).toBe(user.email);
        });
    });
    test('should delete a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { user } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, apiUtils_1.deleteApi)(adminSession.id, `users/${user.id}`);
            const loadedUser = yield (0, testUtils_1.models)().user().load(user.id);
            expect(loadedUser).toBeFalsy();
        });
    });
    test('should list users', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: adminSession } = yield (0, testUtils_1.createUserAndSession)(1, true);
            yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.createUserAndSession)(3);
            const results = yield (0, apiUtils_1.getApi)(adminSession.id, 'users');
            expect(results.items.length).toBe(3);
        });
    });
});
//# sourceMappingURL=users.test.js.map