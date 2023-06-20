import { CustomError, CustomErrorCode } from '../../../utils/errors';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import StorageDriverBase from './StorageDriverBase';

export default class StorageDriverMemory extends StorageDriverBase {

	private data_: Record<string, Buffer> = {};

	public constructor(id: number, config: StorageDriverConfig = null) {
		super(id, { type: StorageDriverType.Memory, ...config });
	}

	public async write(itemId: string, content: Buffer): Promise<void> {
		this.data_[itemId] = content;
	}

	public async read(itemId: string): Promise<Buffer> {
		if (!(itemId in this.data_)) throw new CustomError(`No such item: ${itemId}`, CustomErrorCode.NotFound);
		return this.data_[itemId];
	}

	public async delete(itemId: string | string[]): Promise<void> {
		const itemIds = Array.isArray(itemId) ? itemId : [itemId];
		for (const id of itemIds) {
			delete this.data_[id];
		}
	}

	public async exists(itemId: string): Promise<boolean> {
		return itemId in this.data_;
	}

}
