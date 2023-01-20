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
const joplinCloud_1 = require("@joplin/lib/utils/joplinCloud");
const types_1 = require("../../services/database/types");
const UserModel_1 = require("../../models/UserModel");
const stripe_1 = require("../../utils/stripe");
const testUtils_1 = require("../../utils/testing/testUtils");
const uuidgen_1 = require("../../utils/uuidgen");
const stripe_2 = require("./stripe");
function mockStripe(options = null) {
    options = Object.assign({ userEmail: 'toto@example.com' }, options);
    return {
        customers: {
            retrieve: () => __awaiter(this, void 0, void 0, function* () {
                return {
                    name: 'Toto',
                    email: options.userEmail,
                };
            }),
        },
        subscriptions: {
            del: jest.fn(),
        },
    };
}
function simulateWebhook(ctx, type, object, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({ stripe: mockStripe({ userEmail: options.userEmail }), eventId: (0, uuidgen_1.default)() }, options);
        yield stripe_2.postHandlers.webhook(options.stripe, {}, ctx, {
            id: options.eventId,
            type,
            data: {
                object,
            },
        }, false);
    });
}
function createUserViaSubscription(ctx, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({ subscriptionId: `sub_${(0, uuidgen_1.default)()}`, customerId: `cus_${(0, uuidgen_1.default)()}` }, options);
        const stripeSessionId = 'sess_123';
        const stripePrice = (0, joplinCloud_1.findPrice)((0, stripe_1.stripeConfig)().prices, { accountType: 2, period: joplinCloud_1.PricePeriod.Monthly });
        yield (0, testUtils_1.models)().keyValue().setValue(`stripeSessionToPriceId::${stripeSessionId}`, stripePrice.id);
        yield simulateWebhook(ctx, 'customer.subscription.created', {
            id: options.subscriptionId,
            customer: options.customerId,
            items: {
                data: [
                    {
                        price: stripePrice,
                    },
                ],
            },
        }, options);
    });
}
describe('index/stripe', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index/stripe');
        (0, stripe_1.stripeConfig)().enabled = true;
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should handle the checkout.session.completed event', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', subscriptionId: 'sub_123' });
            const user = yield (0, testUtils_1.models)().user().loadByEmail('toto@example.com');
            expect(user.account_type).toBe(UserModel_1.AccountType.Pro);
            expect(user.email_confirmed).toBe(0);
            const sub = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
            expect(sub.stripe_subscription_id).toBe('sub_123');
            expect(sub.is_deleted).toBe(0);
            expect(sub.last_payment_time).toBeGreaterThanOrEqual(startTime);
            expect(sub.last_payment_failed_time).toBe(0);
        });
    });
    test('should not process the same event twice', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', eventId: 'evt_1' });
            const v = yield (0, testUtils_1.models)().keyValue().value('stripeEventDone::evt_1');
            expect(v).toBe(1);
            // This event should simply be skipped
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return createUserViaSubscription(ctx, { userEmail: 'toto@example.com', eventId: 'evt_1' }); }));
        });
    });
    test('should check if it is a beta user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const user1 = yield (0, testUtils_1.models)().user().save({ email: 'toto@example.com', password: (0, uuidgen_1.default)() });
            const user2 = yield (0, testUtils_1.models)().user().save({ email: 'tutu@example.com', password: (0, uuidgen_1.default)() });
            yield (0, testUtils_1.models)().user().save({ id: user2.id, created_time: 1624441295775 });
            expect(yield (0, stripe_1.isBetaUser)((0, testUtils_1.models)(), user1.id)).toBe(false);
            expect(yield (0, stripe_1.isBetaUser)((0, testUtils_1.models)(), user2.id)).toBe(true);
            yield (0, testUtils_1.models)().subscription().save({
                user_id: user2.id,
                stripe_user_id: 'usr_111',
                stripe_subscription_id: 'sub_111',
                last_payment_time: Date.now(),
            });
            expect(yield (0, stripe_1.isBetaUser)((0, testUtils_1.models)(), user2.id)).toBe(false);
        });
    });
    test('should find out beta user trial end date', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const fromDateTime = 1627901594842; // Mon Aug 02 2021 10:53:14 GMT+0000
            expect((0, stripe_1.betaUserTrialPeriodDays)(1624441295775, fromDateTime)).toBe(50); // Wed Jun 23 2021 09:41:35 GMT+0000
            expect((0, stripe_1.betaUserTrialPeriodDays)(1614682158000, fromDateTime)).toBe(7); // Tue Mar 02 2021 10:49:18 GMT+0000
        });
    });
    test('should setup subscription for an existing user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // This is for example if a user has been manually added to the system,
            // and then later they setup their subscription. Applies to beta users
            // for instance.
            const ctx = yield (0, testUtils_1.koaAppContext)();
            const user = yield (0, testUtils_1.models)().user().save({ email: 'toto@example.com', password: (0, uuidgen_1.default)() });
            expect(yield (0, testUtils_1.models)().subscription().byUserId(user.id)).toBeFalsy();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', subscriptionId: 'sub_123' });
            const sub = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
            expect(sub).toBeTruthy();
            expect(sub.stripe_subscription_id).toBe('sub_123');
        });
    });
    test('should cancel duplicate subscriptions', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = mockStripe();
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe });
            expect((yield (0, testUtils_1.models)().user().all()).length).toBe(1);
            const user = (yield (0, testUtils_1.models)().user().all())[0];
            const subBefore = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
            expect(stripe.subscriptions.del).toHaveBeenCalledTimes(0);
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe });
            expect((yield (0, testUtils_1.models)().user().all()).length).toBe(1);
            const subAfter = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
            expect(stripe.subscriptions.del).toHaveBeenCalledTimes(1);
            expect(subBefore.stripe_subscription_id).toBe(subAfter.stripe_subscription_id);
        });
    });
    test('should disable an account if the sub is cancelled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = mockStripe();
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'sub_init' });
            yield simulateWebhook(ctx, 'customer.subscription.deleted', { id: 'sub_init' });
            const user = (yield (0, testUtils_1.models)().user().all())[0];
            const sub = (yield (0, testUtils_1.models)().subscription().all())[0];
            expect(user.enabled).toBe(0);
            expect(sub.is_deleted).toBe(1);
        });
    });
    test('should re-enable account if sub was cancelled and new sub created', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = mockStripe();
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'sub_init' });
            const user = (yield (0, testUtils_1.models)().user().all())[0];
            const sub = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
            expect(sub.stripe_subscription_id).toBe('sub_init');
            yield simulateWebhook(ctx, 'customer.subscription.deleted', { id: 'sub_init' });
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'cus_recreate' });
            {
                const user = (yield (0, testUtils_1.models)().user().all())[0];
                const sub = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
                expect(user.enabled).toBe(1);
                expect(sub.is_deleted).toBe(0);
                expect(sub.stripe_subscription_id).toBe('cus_recreate');
            }
        });
    });
    test('should re-enable account if successful payment is made', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = mockStripe();
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'sub_init' });
            let user = (yield (0, testUtils_1.models)().user().all())[0];
            yield (0, testUtils_1.models)().user().save({
                id: user.id,
                enabled: 0,
                can_upload: 0,
            });
            yield (0, testUtils_1.models)().userFlag().add(user.id, types_1.UserFlagType.FailedPaymentFinal);
            yield simulateWebhook(ctx, 'invoice.paid', { subscription: 'sub_init' });
            user = yield (0, testUtils_1.models)().user().load(user.id);
            expect(user.enabled).toBe(1);
            expect(user.can_upload).toBe(1);
        });
    });
    test('should attach new sub to existing user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulates:
            // - User subscribes
            // - Later the subscription is cancelled, either automatically by Stripe or manually
            // - Then a new subscription is attached to the user on Stripe
            // => In that case, the sub should be attached to the user on Joplin Server
            const stripe = mockStripe({ userEmail: 'toto@example.com' });
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, {
                stripe,
                subscriptionId: 'sub_1',
                customerId: 'cus_toto',
                userEmail: 'toto@example.com',
            });
            yield simulateWebhook(ctx, 'customer.subscription.deleted', { id: 'sub_1' });
            const stripePrice = (0, joplinCloud_1.findPrice)((0, stripe_1.stripeConfig)().prices, { accountType: 1, period: joplinCloud_1.PricePeriod.Monthly });
            yield simulateWebhook(ctx, 'customer.subscription.created', {
                id: 'sub_new',
                customer: 'cus_toto',
                items: { data: [{ price: { id: stripePrice.id } }] },
            }, { stripe });
            const user = (yield (0, testUtils_1.models)().user().all())[0];
            const sub = yield (0, testUtils_1.models)().subscription().byUserId(user.id);
            expect(sub.stripe_user_id).toBe('cus_toto');
            expect(sub.stripe_subscription_id).toBe('sub_new');
        });
    });
    test('should not cancel a subscription as duplicate if it is already associated with a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // When user goes through a Stripe checkout, we get the following
            // events:
            //
            // - checkout.session.completed
            // - customer.subscription.created
            //
            // However we create the subscription as soon as we get
            // "checkout.session.completed", because by then we already have all the
            // necessary information. The problem is that Stripe is then going to
            // send "customer.subscription.created", even though the sub is already
            // created. Also we have some code to cancel duplicate subscriptions
            // (when a user accidentally subscribe multiple times), and we don't
            // want that newly, valid, subscription to be cancelled as a duplicate.
            const stripe = mockStripe({ userEmail: 'toto@example.com' });
            const ctx = yield (0, testUtils_1.koaAppContext)();
            yield createUserViaSubscription(ctx, {
                stripe,
                subscriptionId: 'sub_1',
                customerId: 'cus_toto',
                userEmail: 'toto@example.com',
            });
            const stripePrice = (0, joplinCloud_1.findPrice)((0, stripe_1.stripeConfig)().prices, { accountType: 1, period: joplinCloud_1.PricePeriod.Monthly });
            yield simulateWebhook(ctx, 'customer.subscription.created', {
                id: 'sub_1',
                customer: 'cus_toto',
                items: { data: [{ price: { id: stripePrice.id } }] },
            }, { stripe });
            // Verify that we didn't try to delete that new subscription
            expect(stripe.subscriptions.del).toHaveBeenCalledTimes(0);
        });
    });
});
//# sourceMappingURL=stripe.test.js.map