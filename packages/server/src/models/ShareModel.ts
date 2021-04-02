import { File, Share, ShareType, Uuid } from '../db';
import { ErrorBadRequest } from '../utils/errors';
import { setQueryParameters } from '../utils/urlUtils';
import BaseModel, { ValidateOptions } from './BaseModel';

export default class ShareModel extends BaseModel<Share> {

	public get tableName(): string {
		return 'shares';
	}

	protected async validate(share: Share, _options: ValidateOptions = {}): Promise<Share> {
		if ('type' in share && ![ShareType.Link, ShareType.App, ShareType.JoplinApp].includes(share.type)) throw new ErrorBadRequest(`Invalid share type: ${share.type}`);

		return share;
	}

	public async createShare(shareType: ShareType, path: string): Promise<Share> {
		const file: File = await this.models().file({ userId: this.userId }).pathToFile(path);

		if (file.source_file_id) throw new ErrorBadRequest('A shared file cannot be shared again');

		const toSave: Share = {
			type: shareType,
			file_id: file.id,
			owner_id: this.userId,
		};

		return this.save(toSave);
	}

	public async createJoplinFolderShare(folderId: string): Promise<Share> {
		const toSave: Share = {
			type: ShareType.JoplinApp,
			folder_id: folderId,
			file_id: '',
			owner_id: this.userId,
		};

		return this.save(toSave);
	}

	public shareUrl(id: Uuid, query: any = null): string {
		return setQueryParameters(`${this.baseUrl}/shares/${id}`, query);
	}

	public async sharesByFileId(fileId: string): Promise<Share[]> {
		return this.db(this.tableName).select(this.defaultFields).where('file_id', '=', fileId);
	}

}
