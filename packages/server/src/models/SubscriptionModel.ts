import { EmailSender, Subscription, Uuid } from '../db';
import { MB } from '../utils/bytes';
import { ErrorNotFound } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import BaseModel from './BaseModel';

export default class SubscriptionModel extends BaseModel<Subscription> {

	public get tableName(): string {
		return 'subscriptions';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async handlePayment(subscriptionId: string, success: boolean) {
		const sub = await this.bySubscriptionId(subscriptionId);
		if (!sub) throw new ErrorNotFound(`No such subscription: ${subscriptionId}`);

		const now = Date.now();

		const toSave: Subscription = { id: sub.id };

		if (success) {
			toSave.last_payment_time = now;
		} else {
			toSave.last_payment_failed_time = now;

			const user = await this.models().user().load(sub.user_id, { fields: ['email'] });

			await this.models().email().push({
				subject: `${this.appName} subscription payment failed`,
				body: `Your invoice payment has failed. Please follow this URL to update your payment details: \n\n[Manage your subscription](${this.baseUrl}/portal)`,
				recipient_email: user.email,
				sender_id: EmailSender.Support,
			});
		}

		await this.save(toSave);
	}

	public async bySubscriptionId(id: string): Promise<Subscription> {
		return this.db(this.tableName).select(this.defaultFields).where('stripe_subscription_id', '=', id).first();
	}

	public async byUserId(userId: Uuid): Promise<Subscription> {
		return this.db(this.tableName).select(this.defaultFields).where('user_id', '=', userId).first();
	}

	public async saveUserAndSubscription(email: string, accountType: number, stripeUserId: string, stripeSubscriptionId: string) {
		return this.withTransaction(async () => {
			const user = await this.models().user().save({
				email,
				email_confirmed: 1,
				can_share: 1,
				max_item_size: 200 * MB,
				password: uuidgen(),
				account_type: accountType,
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
