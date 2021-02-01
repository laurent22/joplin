import { ShareRecipient } from '../db';
import BaseModel from './BaseModel';

export default class ShareRecipientModel extends BaseModel<ShareRecipient> {

	public get tableName(): string {
		return 'share_recipients';
	}

}
