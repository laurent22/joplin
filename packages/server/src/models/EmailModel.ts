import { Uuid, Email, EmailSender } from '../db';
import BaseModel from './BaseModel';

export interface EmailToSend {
	sender_id: EmailSender;
	recipient_email: string;
	subject: string;
	body: string;

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

	public async push(email: EmailToSend) {
		const output = await super.save({ ...email });
		EmailModel.eventEmitter.emit('queued');
		return output;
	}

	public async needToBeSent(): Promise<Email[]> {
		return this.db(this.tableName).where('sent_time', '=', 0);
	}

	public async deleteAll() {
		await this.db(this.tableName).delete();
	}

}
