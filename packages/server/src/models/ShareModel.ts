import { File, Share, ShareType } from '../db';
import { ErrorBadRequest } from '../utils/errors';
import BaseModel, { ValidateOptions } from './BaseModel';

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}

	protected async validate(share: Share, _options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Link, ShareType.App].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);

		return share;
	}

	public async add(type: ShareType, fileId: string): Promise<Share> {
		const file: File = await this.models().file({ userId: this.userId }).entityFromItemId(fileId, { mustExist: true });

		const toSave: Share = {
			type: type,
			file_id: file.id,
			owner_id: this.userId,
		};

		return this.save(toSave);
	}

}
