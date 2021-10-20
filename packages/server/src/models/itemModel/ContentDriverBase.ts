import { Models } from '../factory';

// ItemModel passes the models object when calling any of the driver handler.
// This is so that if there's an active transaction, the driver can use that (as
// required for example by ContentDriverDatabase).

export interface Context {
	models: Models;
}

export default class ContentDriverBase {

	public async write(_itemId: string, _content: Buffer, _context: Context): Promise<void> { throw new Error('Not implemented'); }

	public async read(_itemId: string, _context: Context): Promise<Buffer | null> { throw new Error('Not implemented'); }

	public async delete(_itemId: string | string[], _context: Context): Promise<void> { throw new Error('Not implemented'); }

	// public async size(_itemId:string, _context: Context):Promise<number> { throw new Error('Not implemented') };

}
