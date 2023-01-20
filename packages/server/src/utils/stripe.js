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
exports.updateCustomerEmail = exports.betaStartSubUrl = exports.betaUserTrialPeriodDays = exports.isBetaUser = exports.betaUserDateRange = exports.updateSubscriptionType = exports.cancelSubscription = exports.cancelSubscriptionByUserId = exports.stripePriceIdByStripeSub = exports.stripePriceIdByUserId = exports.subscriptionInfoByUserId = exports.accountTypeToPriceId = exports.priceIdToAccountType = exports.initStripe = exports.stripeConfig = void 0;
const config_1 = require("../config");
const joplinCloud_1 = require("@joplin/lib/utils/joplinCloud");
const errors_1 = require("./errors");
const stripeLib = require('stripe');
function stripeConfig() {
    return (0, config_1.default)().stripe;
}
exports.stripeConfig = stripeConfig;
function initStripe() {
    return stripeLib(stripeConfig().secretKey);
}
exports.initStripe = initStripe;
function priceIdToAccountType(priceId) {
    const price = (0, joplinCloud_1.findPrice)(stripeConfig().prices, { priceId });
    return price.accountType;
}
exports.priceIdToAccountType = priceIdToAccountType;
function accountTypeToPriceId(accountType) {
    const price = (0, joplinCloud_1.findPrice)(stripeConfig().prices, { accountType, period: joplinCloud_1.PricePeriod.Monthly });
    return price.id;
}
exports.accountTypeToPriceId = accountTypeToPriceId;
function subscriptionInfoByUserId(models, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sub = yield models.subscription().byUserId(userId);
        if (!sub)
            throw new errors_1.ErrorWithCode('Could not retrieve subscription info', 'no_sub');
        const stripe = initStripe();
        const stripeSub = yield stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        if (!stripeSub)
            throw new errors_1.ErrorWithCode('Could not retrieve Stripe subscription', 'no_stripe_sub');
        return { sub, stripeSub };
    });
}
exports.subscriptionInfoByUserId = subscriptionInfoByUserId;
function stripePriceIdByUserId(models, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { stripeSub } = yield subscriptionInfoByUserId(models, userId);
        return stripePriceIdByStripeSub(stripeSub);
    });
}
exports.stripePriceIdByUserId = stripePriceIdByUserId;
function stripePriceIdByStripeSub(stripeSub) {
    return stripeSub.items.data[0].price.id;
}
exports.stripePriceIdByStripeSub = stripePriceIdByStripeSub;
function cancelSubscriptionByUserId(models, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sub = yield models.subscription().byUserId(userId);
        if (!sub)
            throw new Error(`No subscription for user: ${userId}`);
        const stripe = initStripe();
        yield stripe.subscriptions.del(sub.stripe_subscription_id);
    });
}
exports.cancelSubscriptionByUserId = cancelSubscriptionByUserId;
function cancelSubscription(stripe, stripeSubId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield stripe.subscriptions.del(stripeSubId);
    });
}
exports.cancelSubscription = cancelSubscription;
function updateSubscriptionType(models, userId, newAccountType) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield models.user().load(userId);
        if (user.account_type === newAccountType)
            throw new Error(`Account type is already: ${newAccountType}`);
        const { sub, stripeSub } = yield subscriptionInfoByUserId(models, userId);
        const currentPrice = (0, joplinCloud_1.findPrice)(stripeConfig().prices, { priceId: stripePriceIdByStripeSub(stripeSub) });
        const upgradePrice = (0, joplinCloud_1.findPrice)(stripeConfig().prices, { accountType: newAccountType, period: currentPrice.period });
        const items = [];
        // First delete all the items that don't match the new account type. That
        // means for example deleting the "Joplin Cloud Pro" item if the new account
        // type is "Basic" and vice versa.
        for (const stripeSubItem of stripeSub.items.data) {
            if (stripeSubItem.price.id === upgradePrice.id)
                throw new Error(`This account is already of type ${newAccountType}`);
            if (stripeSubItem.price.id !== upgradePrice.id) {
                items.push({
                    id: stripeSubItem.id,
                    deleted: true,
                });
            }
        }
        // Then add the item that we need, either Pro or Basic plan. It seems it's
        // sufficient to specify the price ID, and from that Stripe infers the
        // product.
        items.push({
            price: upgradePrice.id,
        });
        // Note that we only update the Stripe subscription here (or attempt to do
        // so). The local subscription object will only be updated when we get the
        // `customer.subscription.updated` event back from Stripe.
        //
        // It shouldn't have a big impact since it's only for a short time, but it
        // means in the meantime the account type will not be changed and, for
        // example, the user could try to upgrade the account a second time.
        // Although that attempt would most likely fail due the checks above and
        // the checks in subscriptions.update().
        const stripe = initStripe();
        yield stripe.subscriptions.update(sub.stripe_subscription_id, { items });
    });
}
exports.updateSubscriptionType = updateSubscriptionType;
function betaUserDateRange() {
    return [1623785440603, 1626690298054];
}
exports.betaUserDateRange = betaUserDateRange;
function isBetaUser(models, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!stripeConfig().enabled)
            return false;
        const user = yield models.user().load(userId, { fields: ['created_time'] });
        if (!user)
            throw new Error(`No such user: ${userId}`);
        const range = betaUserDateRange();
        if (user.created_time > range[1])
            return false; // approx 19/07/2021 11:24
        if (user.created_time < range[0])
            return false;
        const sub = yield models.subscription().byUserId(userId);
        return !sub;
    });
}
exports.isBetaUser = isBetaUser;
function betaUserTrialPeriodDays(userCreatedTime, fromDateTime = 0, minDays = 7) {
    fromDateTime = fromDateTime ? fromDateTime : Date.now();
    const oneDayMs = 86400 * 1000;
    const oneMonthMs = oneDayMs * 30;
    const endOfBetaPeriodMs = userCreatedTime + oneMonthMs * 3;
    const remainingTimeMs = endOfBetaPeriodMs - fromDateTime;
    const remainingTimeDays = Math.ceil(remainingTimeMs / oneDayMs);
    // Stripe requires a minimum of 48 hours, but let's put 7 days to be sure
    return remainingTimeDays < minDays ? minDays : remainingTimeDays;
}
exports.betaUserTrialPeriodDays = betaUserTrialPeriodDays;
function betaStartSubUrl(email, accountType) {
    return `${(0, config_1.default)().joplinAppBaseUrl}/plans/?email=${encodeURIComponent(email)}&account_type=${encodeURIComponent(accountType)}`;
}
exports.betaStartSubUrl = betaStartSubUrl;
function updateCustomerEmail(models, userId, newEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        const subInfo = yield subscriptionInfoByUserId(models, userId);
        const stripe = initStripe();
        yield stripe.customers.update(subInfo.sub.stripe_user_id, {
            email: newEmail,
        });
    });
}
exports.updateCustomerEmail = updateCustomerEmail;
//# sourceMappingURL=stripe.js.map