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
const UserModel_1 = require("./UserModel");
const bytes_1 = require("../utils/bytes");
const user_1 = require("./utils/user");
describe('SubscriptionModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('SubscriptionModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create a user and subscription', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.models)().subscription().saveUserAndSubscription('toto@example.com', 'Toto', UserModel_1.AccountType.Pro, 'STRIPE_USER_ID', 'STRIPE_SUB_ID');
            const user = yield (0, testUtils_1.models)().user().loadByEmail('toto@example.com');
            const sub = yield (0, testUtils_1.models)().subscription().byStripeSubscriptionId('STRIPE_SUB_ID');
            expect(user.account_type).toBe(UserModel_1.AccountType.Pro);
            expect(user.email).toBe('toto@example.com');
            expect(user.full_name).toBe('Toto');
            expect((0, user_1.getCanShareFolder)(user)).toBe(1);
            expect((0, user_1.getMaxItemSize)(user)).toBe(200 * bytes_1.MB);
            expect(sub.stripe_subscription_id).toBe('STRIPE_SUB_ID');
            expect(sub.stripe_user_id).toBe('STRIPE_USER_ID');
            expect(sub.user_id).toBe(user.id);
        });
    });
    test('should enable and allow the user to upload if a payment is successful', function () {
        return __awaiter(this, void 0, void 0, function* () {
            let { user } = yield (0, testUtils_1.models)().subscription().saveUserAndSubscription('toto@example.com', 'Toto', UserModel_1.AccountType.Pro, 'STRIPE_USER_ID', 'STRIPE_SUB_ID');
            yield (0, testUtils_1.models)().user().save({
                id: user.id,
                enabled: 0,
                can_upload: 0,
            });
            yield (0, testUtils_1.models)().subscription().handlePayment('STRIPE_SUB_ID', true);
            user = yield (0, testUtils_1.models)().user().load(user.id);
            expect(user.can_upload).toBe(1);
            expect(user.enabled).toBe(1);
        });
    });
});
//# sourceMappingURL=SubscriptionModel.test.js.map