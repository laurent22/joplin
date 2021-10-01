import { Uuid, Email, EmailSender } from '../services/database/types';
import BaseModel from './BaseModel';

export interface EmailToSend {
	sender_id: EmailSender;
	recipient_email: string;
	subject: string;
	body: string;
	key?: string;

	recipient_name?: string;
	recipient_id?: Uuid;
}

export interface EmailSubjectBody {
	subject: string;
	body: string;
}

export default class EmailModel extends BaseModel<Email> {

	public get tableName(): string {
		return 'emails';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async push(email: EmailToSend): Promise<Email | null> {
		if (email.key) {
			const existingEmail = await this.byRecipientAndKey(email.recipient_email, email.key);
			if (existingEmail) return null; // noop - the email has already been sent
		}

		const output = await super.save({ ...email });
		EmailModel.eventEmitter.emit('queued');
		return output;
	}

	private async byRecipientAndKey(recipientEmail: string, key: string): Promise<Email> {
		if (!key) throw new Error('Key cannot be empty');

		return this.db(this.tableName)
			.where('recipient_email', '=', recipientEmail)
			.where('key', '=', key)
			.first();
	}

	public async needToBeSent(): Promise<Email[]> {
		return this.db(this.tableName).where('sent_time', '=', 0);
	}

	public async deleteAll() {
		await this.db(this.tableName).delete();
	}

}
