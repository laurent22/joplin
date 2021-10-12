import { mkdirp, readFile, remove, writeFile } from 'fs-extra';
import ContentDriverBase from './ContentDriverBase';

interface Options {
	basePath: string;
}

export default class ContentDriverFs extends ContentDriverBase {

	private options_: Options;
	private basePathCreated_: boolean = false;

	public constructor(options: Options) {
		super();

		this.options_ = options;
	}

	private async checkBasePath() {
		if (this.basePathCreated_) return;
		await mkdirp(this.options_.basePath);
		this.basePathCreated_ = true;
	}

	private itemPath(itemId: string): string {
		return `${this.options_.basePath}/${itemId}`;
	}

	public async write(itemId: string, content: Buffer): Promise<void> {
		await this.checkBasePath();
		await writeFile(this.itemPath(itemId), content);
	}

	public async read(itemId: string): Promise<Buffer | null> {
		return readFile(this.itemPath(itemId));
	}

	public async delete(itemId: string | string[]): Promise<void> {
		const itemIds = Array.isArray(itemId) ? itemId : [itemId];
		for (const id of itemIds) {
			await remove(this.itemPath(id));
		}
	}

}
