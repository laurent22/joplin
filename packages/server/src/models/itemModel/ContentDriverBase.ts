export default class ContentDriverBase {

	public async write(_itemId: string, _content: Buffer): Promise<void> {}

	public async read(_itemId: string): Promise<Buffer | null> { return null; }

	public async delete(_itemId: string | string[]): Promise<void> {}

}
