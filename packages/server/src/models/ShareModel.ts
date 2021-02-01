import { Share, ShareType, Uuid } from '../db';
import { ErrorBadRequest } from '../utils/errors';
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

	public async add(type: ShareType, path: string): Promise<Share> {
		const fileId: Uuid = await this.models().file({ userId: this.userId }).pathToFileId(path);

		const toSave: Share = {
			type: type,
			file_id: fileId,
			owner_id: this.userId,
		};

		return this.save(toSave);
	}

	public shareUrl(id: Uuid, query: any = null): string {
		return setQueryParameters(`${this.baseUrl}/shares/${id}`, query);
	}

}
