import { Share, ShareType, Uuid } from '../db';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { setQueryParameters } from '../utils/urlUtils';
import BaseModel, { ValidateOptions } from './BaseModel';

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}
	
	protected async validate(share: Share, _options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Link, ShareType.App].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);

		return share;
	}

	public async createLinkShare(path: string): Promise<Share> {
		const fileId: Uuid = await this.models().file({ userId: this.userId }).pathToFileId(path);

		const toSave: Share = {
			type: ShareType.Link,
			file_id: fileId,
			owner_id: this.userId,
		};

		return this.save(toSave);
	}

	public async createAppShare(path: string, recipientEmail:string): Promise<Share> {
		const user = await this.models().user().loadByEmail(recipientEmail);
		if (!user) throw new ErrorNotFound('No user with email "' + recipientEmail + '"');

		const fileId: Uuid = await this.models().file({ userId: this.userId }).pathToFileId(path);

		await this.withTransaction(async () => {
			const toSave: Share = {
				type: ShareType.App,
				file_id: fileId,
				owner_id: this.userId,
			};

			const share = await this.save(toSave);

			await this.models().shareRecipient().save({
				share_id: share.id,
				user_id: user.id,
			});
		});
	}

	public shareUrl(id: Uuid, query: any = null): string {
		return setQueryParameters(`${this.baseUrl}/shares/${id}`, query);
	}

}
