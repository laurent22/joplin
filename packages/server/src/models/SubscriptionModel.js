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
exports.failedPaymentFinalAccount = exports.failedPaymentWarningInterval = void 0;
const types_1 = require("../services/database/types");
const errors_1 = require("../utils/errors");
const time_1 = require("../utils/time");
const uuidgen_1 = require("../utils/uuidgen");
const paymentFailedTemplate_1 = require("../views/emails/paymentFailedTemplate");
const BaseModel_1 = require("./BaseModel");
exports.failedPaymentWarningInterval = 7 * time_1.Day;
exports.failedPaymentFinalAccount = 14 * time_1.Day;
var PaymentAttemptStatus;
(function (PaymentAttemptStatus) {
    PaymentAttemptStatus["Success"] = "Success";
    PaymentAttemptStatus["Failed"] = "Failed";
})(PaymentAttemptStatus || (PaymentAttemptStatus = {}));
class SubscriptionModel extends BaseModel_1.default {
    get tableName() {
        return 'subscriptions';
    }
    hasUuid() {
        return false;
    }
    lastPaymentAttempt(sub) {
        if (sub.last_payment_failed_time > sub.last_payment_time) {
            return {
                status: PaymentAttemptStatus.Failed,
                time: sub.last_payment_failed_time,
            };
        }
        return {
            status: PaymentAttemptStatus.Success,
            time: sub.last_payment_time,
        };
    }
    failedPaymentSubscriptionsBaseQuery(cutOffTime) {
        const query = this.db('users')
            .leftJoin('subscriptions', 'users.id', 'subscriptions.user_id')
            .select('subscriptions.id', 'subscriptions.user_id', 'last_payment_failed_time')
            .where('last_payment_failed_time', '>', this.db.ref('last_payment_time'))
            .where('subscriptions.is_deleted', '=', 0)
            .where('last_payment_failed_time', '<', cutOffTime)
            .where('users.enabled', '=', 1);
        return query;
    }
    failedPaymentWarningSubscriptions() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.failedPaymentSubscriptionsBaseQuery(Date.now() - exports.failedPaymentWarningInterval);
        });
    }
    failedPaymentFinalSubscriptions() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.failedPaymentSubscriptionsBaseQuery(Date.now() - exports.failedPaymentFinalAccount);
        });
    }
    handlePayment(stripeSubscriptionId, success) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield this.byStripeSubscriptionId(stripeSubscriptionId);
            if (!sub)
                throw new errors_1.ErrorNotFound(`No such subscription: ${stripeSubscriptionId}`);
            const now = Date.now();
            if (success) {
                // When a payment is successful, we also activate upload and enable
                // the user, in case it has been disabled previously due to a failed
                // payment.
                const user = yield this.models().user().load(sub.user_id);
                yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.models().userFlag().removeMulti(user.id, [
                        types_1.UserFlagType.FailedPaymentWarning,
                        types_1.UserFlagType.FailedPaymentFinal,
                    ]);
                    yield this.save({
                        id: sub.id,
                        last_payment_time: now,
                        last_payment_failed_time: 0,
                    });
                }), 'SubscriptionModel::handlePayment');
            }
            else {
                // We only update the payment failed time if it's not already set
                // since the only thing that matter is the first time the payment
                // failed.
                //
                // We don't update the user can_upload and enabled properties here
                // because it's done after a few days from TaskService.
                if (!sub.last_payment_failed_time) {
                    yield this.save({
                        id: sub.id,
                        last_payment_failed_time: now,
                    });
                }
                // We send an email reminder every time the payment fails because
                // previous emails might not have been received for whatever reason.
                const user = yield this.models().user().load(sub.user_id, { fields: ['email', 'id', 'full_name'] });
                yield this.models().email().push(Object.assign(Object.assign({}, (0, paymentFailedTemplate_1.default)()), { recipient_email: user.email, recipient_id: user.id, recipient_name: user.full_name || '', sender_id: types_1.EmailSender.NoReply }));
            }
        });
    }
    byStripeSubscriptionId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).select(this.defaultFields).where('stripe_subscription_id', '=', id).where('is_deleted', '=', 0).first();
        });
    }
    byUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).select(this.defaultFields).where('user_id', '=', userId).where('is_deleted', '=', 0).first();
        });
    }
    saveUserAndSubscription(email, fullName, accountType, stripeUserId, stripeSubscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                const user = yield this.models().user().save({
                    account_type: accountType,
                    email,
                    full_name: fullName,
                    email_confirmed: 0,
                    password: (0, uuidgen_1.default)(),
                    must_set_password: 1,
                });
                const subscription = yield this.save({
                    user_id: user.id,
                    stripe_user_id: stripeUserId,
                    stripe_subscription_id: stripeSubscriptionId,
                    last_payment_time: Date.now(),
                });
                return { user, subscription };
            }), 'SubscriptionModel::saveUserAndSubscription');
        });
    }
    toggleSoftDelete(id, isDeleted) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = yield this.load(`${id}`);
            if (!sub)
                throw new Error(`No such subscription: ${id}`);
            yield this.save({ id, is_deleted: isDeleted ? 1 : 0 });
        });
    }
}
exports.default = SubscriptionModel;
//# sourceMappingURL=SubscriptionModel.js.map