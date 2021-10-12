import ContentDriverBase from './ContentDriverBase';

export default class ContentDriverMemory extends ContentDriverBase {

	private data_: Record<string, Buffer> = {};

	public async write(itemId: string, content: Buffer): Promise<void> {
		this.data_[itemId] = content;
	}

	public async read(itemId: string): Promise<Buffer | null> {
		return this.data_[itemId];
	}

	public async delete(itemId: string | string[]): Promise<void> {
		const itemIds = Array.isArray(itemId) ? itemId : [itemId];
		for (const id of itemIds) {
			delete this.data_[id];
		}
	}

}
