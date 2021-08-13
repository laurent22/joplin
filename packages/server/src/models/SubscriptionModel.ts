import { EmailSender, Subscription, User, Uuid } from '../db';
import { ErrorNotFound } from '../utils/errors';
import { Day } from '../utils/time';
import uuidgen from '../utils/uuidgen';
import paymentFailedTemplate from '../views/emails/paymentFailedTemplate';
import BaseModel from './BaseModel';
import { AccountType } from './UserModel';

export const failedPaymentDisableUploadInterval = 7 * Day;
export const failedPaymentDisableAccount = 14 * Day;

interface UserAndSubscription {
	user: User;
	subscription: Subscription;
}

enum PaymentAttemptStatus {
	Success = 'Success',
	Failed = 'Failed',
}

interface PaymentAttempt {
	status: PaymentAttemptStatus;
	time: number;
}

export default class SubscriptionModel extends BaseModel<Subscription> {

	public get tableName(): string {
		return 'subscriptions';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public lastPaymentAttempt(sub: Subscription): PaymentAttempt {
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

	public async shouldDisableUploadSubscriptions(): Promise<Subscription[]> {
		const cutOffTime = Date.now() - failedPaymentDisableUploadInterval;

		return this.db('users')
			.leftJoin('subscriptions', 'users.id', 'subscriptions.user_id')
			.select('subscriptions.id', 'subscriptions.user_id', 'last_payment_failed_time')
			.where('users.can_upload', '=', 1)
			.andWhere('last_payment_failed_time', '>', this.db.ref('last_payment_time'))
			.andWhere('subscriptions.is_deleted', '=', 0)
			.andWhere('last_payment_failed_time', '<', cutOffTime);
	}

	public async shouldDisableAccountSubscriptions(): Promise<Subscription[]> {
		const cutOffTime = Date.now() - failedPaymentDisableAccount;

		return this.db(this.tableName)
			.where('last_payment_failed_time', '>', 'last_payment_time')
			.andWhere('last_payment_failed_time', '<', cutOffTime);
	}

	public async handlePayment(stripeSubscriptionId: string, success: boolean) {
		const sub = await this.byStripeSubscriptionId(stripeSubscriptionId);
		if (!sub) throw new ErrorNotFound(`No such subscription: ${stripeSubscriptionId}`);

		const now = Date.now();

		if (success) {
			// When a payment is successful, we also activate upload and enable
			// the user, in case it has been disabled previously due to a failed
			// payment.
			const user = await this.models().user().load(sub.user_id);

			await this.withTransaction(async () => {
				if (!user.enabled || !user.can_upload) {
					await this.models().user().save({
						id: sub.user_id,
						enabled: 1,
						can_upload: 1,
					});
				}

				await this.save({
					id: sub.id,
					last_payment_time: now,
					last_payment_failed_time: 0,
				});
			});
		} else {
			// We only update the payment failed time if it's not already set
			// since the only thing that matter is the first time the payment
			// failed.
			//
			// We don't update the user can_upload and enabled properties here
			// because it's done after a few days from CronService.
			if (!sub.last_payment_failed_time) {
				const user = await this.models().user().load(sub.user_id, { fields: ['email', 'id', 'full_name'] });

				await this.models().email().push({
					...paymentFailedTemplate(),
					recipient_email: user.email,
					recipient_id: user.id,
					recipient_name: user.full_name || '',
					sender_id: EmailSender.Support,
				});

				await this.save({
					id: sub.id,
					last_payment_failed_time: now,
				});
			}
		}
	}

	public async byStripeSubscriptionId(id: string): Promise<Subscription> {
		return this.db(this.tableName).select(this.defaultFields).where('stripe_subscription_id', '=', id).where('is_deleted', '=', 0).first();
	}

	public async byUserId(userId: Uuid): Promise<Subscription> {
		return this.db(this.tableName).select(this.defaultFields).where('user_id', '=', userId).where('is_deleted', '=', 0).first();
	}

	public async saveUserAndSubscription(email: string, fullName: string, accountType: AccountType, stripeUserId: string, stripeSubscriptionId: string) {
		return this.withTransaction<UserAndSubscription>(async () => {
			const user = await this.models().user().save({
				account_type: accountType,
				email,
				full_name: fullName,
				email_confirmed: 1,
				password: uuidgen(),
				must_set_password: 1,
			});

			const subscription = await this.save({
				user_id: user.id,
				stripe_user_id: stripeUserId,
				stripe_subscription_id: stripeSubscriptionId,
				last_payment_time: Date.now(),
			});

			return { user, subscription };
		});
	}

	public async toggleSoftDelete(id: number, isDeleted: boolean) {
		const sub = await this.load(`${id}`);
		if (!sub) throw new Error(`No such subscription: ${id}`);
		await this.save({ id, is_deleted: isDeleted ? 1 : 0 });
	}

}
