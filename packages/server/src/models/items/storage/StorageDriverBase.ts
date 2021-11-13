import { StorageDriverConfig, StorageDriverMode } from '../../../utils/types';
import { Models } from '../../factory';

// ItemModel passes the models object when calling any of the driver handler.
// This is so that if there's an active transaction, the driver can use that (as
// required for example by StorageDriverDatabase).

export interface Context {
	models: Models;
}

export default class StorageDriverBase {

	private storageId_: number;
	private config_: StorageDriverConfig;

	public constructor(storageId: number, config: StorageDriverConfig) {
		this.storageId_ = storageId;
		this.config_ = config;
	}

	public get storageId(): number {
		return this.storageId_;
	}

	public get config(): StorageDriverConfig {
		return this.config_;
	}

	public get mode(): StorageDriverMode {
		return this.config.mode || StorageDriverMode.ReadAndClear;
	}

	public async write(_itemId: string, _content: Buffer, _context: Context): Promise<void> { throw new Error('Not implemented'); }

	public async read(_itemId: string, _context: Context): Promise<Buffer> { throw new Error('Not implemented'); }

	public async delete(_itemId: string | string[], _context: Context): Promise<void> { throw new Error('Not implemented'); }

	public async exists(_itemId: string, _context: Context): Promise<boolean> { throw new Error('Not implemented'); }

}
