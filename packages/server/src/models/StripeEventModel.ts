import { isUniqueConstraintError } from '../db';
import { StripeEvent, StripeEventStatus } from '../services/database/types';
import { ApiError, ErrorOptions } from '../utils/errors';
import BaseModel from './BaseModel';

export class ErrorTaskInProgress extends ApiError {
	public static httpCode = 409; // conflict
	public retryAfterMs = 0;

	public constructor(message = 'Task in progress', options: ErrorOptions = null) {
		super(message, ErrorTaskInProgress.httpCode, options);
		Object.setPrototypeOf(this, ErrorTaskInProgress.prototype);
	}
}

interface WithTaskOptions {
	stripeEventId: string;
}

export default class StripeEventModel extends BaseModel<StripeEvent> {

	public get tableName(): string {
		return 'stripe_events';
	}

	protected hasUuid(): boolean {
		return true;
	}

	protected loadByEventId(eventId: string): Promise<StripeEvent> {
		return this
			.db(this.tableName)
			.select(this.defaultFields)
			.where('stripe_id', '=', eventId)
			.first();
	}

	// Rejects if a task with the same ID is already in progress or has previously completed
	public async withTask(task: ()=> Promise<void>, { stripeEventId }: WithTaskOptions) {
		const previousRecord = await this.loadByEventId(stripeEventId);
		if (previousRecord) {
			throw new ErrorTaskInProgress(`Event ${stripeEventId} already processed. Status: ${previousRecord.status}.`);
		}

		let taskRecord: StripeEvent;
		try {
			taskRecord = await this.save({
				stripe_id: stripeEventId,
				status: StripeEventStatus.InProgress,
			}, {
				// Require that this be a new entry (with a unique stripe_id).
				// This helps avoid a race condition if two identical Stripe events pass the
				// previousRecord check at roughly the same time. An earlier check is still
				// important, since a non-unique stripe_id here logs a verbose unique constraint error.
				isNew: true,
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ErrorTaskInProgress(error.message);
			} else {
				throw error;
			}
		}

		try {
			await task();

			await this.save({
				id: taskRecord.id,
				status: StripeEventStatus.Success,
			});
		} catch (error) {
			await this.save({
				id: taskRecord.id,
				status: StripeEventStatus.Errored,
			});
			throw error;
		}
	}

	public async clearInProgressEvents() {
		await this.withTransaction(async () => {
			await this.db(this.tableName)
				.where('status', '=', StripeEventStatus.InProgress)
				.delete();
		}, 'StripeEventModel::clearInProgressEvents');
	}
}
