import { EmailSender, Subscription, Uuid } from '../db';
import { ErrorNotFound } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import paymentFailedTemplate from '../views/emails/paymentFailedTemplate';
import BaseModel from './BaseModel';
import { AccountType } from './UserModel';

export default class SubscriptionModel extends BaseModel<Subscription> {

	public get tableName(): string {
		return 'subscriptions';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async handlePayment(subscriptionId: string, success: boolean) {
		const sub = await this.byStripeSubscriptionId(subscriptionId);
		if (!sub) throw new ErrorNotFound(`No such subscription: ${subscriptionId}`);

		const now = Date.now();

		const toSave: Subscription = { id: sub.id };

		if (success) {
			toSave.last_payment_time = now;
		} else {
			toSave.last_payment_failed_time = now;

			const user = await this.models().user().load(sub.user_id, { fields: ['email', 'id', 'full_name'] });

			await this.models().email().push({
				...paymentFailedTemplate(),
				recipient_email: user.email,
				recipient_id: user.id,
				recipient_name: user.full_name || '',
				sender_id: EmailSender.Support,
			});
		}

		await this.save(toSave);
	}

	public async byStripeSubscriptionId(id: string): Promise<Subscription> {
		return this.db(this.tableName).select(this.defaultFields).where('stripe_subscription_id', '=', id).first();
	}

	public async byUserId(userId: Uuid): Promise<Subscription> {
		return this.db(this.tableName).select(this.defaultFields).where('user_id', '=', userId).first();
	}

	public async saveUserAndSubscription(email: string, accountType: AccountType, stripeUserId: string, stripeSubscriptionId: string) {
		return this.withTransaction(async () => {
			const user = await this.models().user().save({
				account_type: accountType,
				email,
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

}
