import { mkdirp, pathExists, readFile, remove, writeFile } from 'fs-extra';
import { CustomError, CustomErrorCode } from '../../../utils/errors';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import StorageDriverBase from './StorageDriverBase';

export default class StorageDriverFs extends StorageDriverBase {

	private pathCreated_: Record<string, boolean> = {};

	public constructor(id: number, config: StorageDriverConfig) {
		super(id, { type: StorageDriverType.Filesystem, ...config });
	}

	private async createParentDirectories(path: string) {
		const p = path.split('/');
		p.pop();
		const basename = p.join('/');

		if (this.pathCreated_[basename]) return;
		await mkdirp(basename);
		this.pathCreated_[basename] = true;
	}

	private itemPath(itemId: string): string {
		return `${this.config.path}/${itemId.substr(0, 2).toLowerCase()}/${itemId.substr(2, 2).toLowerCase()}/${itemId}`;
	}

	public async write(itemId: string, content: Buffer): Promise<void> {
		const itemPath = this.itemPath(itemId);
		await this.createParentDirectories(itemPath);
		await writeFile(itemPath, content);
	}

	public async read(itemId: string): Promise<Buffer> {
		try {
			const result = await readFile(this.itemPath(itemId));
			return result;
		} catch (error) {
			if (error.code === 'ENOENT') throw new CustomError(`Not found: ${itemId}`, CustomErrorCode.NotFound);
			throw error;
		}
	}

	public async delete(itemId: string | string[]): Promise<void> {
		const itemIds = Array.isArray(itemId) ? itemId : [itemId];
		for (const id of itemIds) {
			try {
				await remove(this.itemPath(id));
			} catch (error) {
				if (error.code === 'ENOENT') throw new CustomError(`Not found: ${itemId}`, CustomErrorCode.NotFound);
				throw error;
			}
		}
	}

	public async exists(itemId: string): Promise<boolean> {
		return pathExists(this.itemPath(itemId));
	}

}
