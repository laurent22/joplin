import { ContentDriverMode } from '../../utils/types';
import { Models } from '../factory';

// ItemModel passes the models object when calling any of the driver handler.
// This is so that if there's an active transaction, the driver can use that (as
// required for example by ContentDriverDatabase).

export interface Context {
	models: Models;
}

export interface Options {
	mode?: ContentDriverMode;
}

export default class ContentDriverBase {

	private mode_: ContentDriverMode = ContentDriverMode.ReadOnly;

	public constructor(options: Options = null) {
		options = {
			mode: ContentDriverMode.ReadOnly,
			...options,
		};

		this.mode_ = options.mode;
	}

	public get mode(): ContentDriverMode {
		return this.mode_;
	}

	public async write(_itemId: string, _content: Buffer, _context: Context): Promise<void> { throw new Error('Not implemented'); }

	public async read(_itemId: string, _context: Context): Promise<Buffer | null> { throw new Error('Not implemented'); }

	public async delete(_itemId: string | string[], _context: Context): Promise<void> { throw new Error('Not implemented'); }

	public async exists(_itemId: string, _context: Context): Promise<boolean> { throw new Error('Not implemented'); }

}
