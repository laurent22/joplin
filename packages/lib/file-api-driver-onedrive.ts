/* eslint-disable @typescript-eslint/no-explicit-any */
import moment = require('moment');
import { basicDelta, FileApi } from './file-api';
import { dirname, basename, ltrimSlashes } from './path-utils';
import shim from './shim';
import { Buffer } from 'buffer';
import OneDriveApi from './onedrive-api';

export default class FileApiDriverOneDrive {
	private api_: OneDriveApi;
	private fileApi_: FileApi;

	public constructor(api: OneDriveApi) {
		this.api_ = api;
	}

	public setFileApi(f: FileApi) {
		this.fileApi_ = f;
	}

	public api() {
		return this.api_;
	}

	private itemFilter_() {
		return {
			select: 'name,file,folder,fileSystemInfo,parentReference',
		};
	}

	private makePath_(path: string) {
		return path;
	}

	private makeItems_(odItems: any[]) {
		const output = [];
		for (let i = 0; i < odItems.length; i++) {
			output.push(this.makeItem_(odItems[i]));
		}
		return output;
	}

	private makeItem_(odItem: any) {
		const output: any = {
			path: odItem.name,
			isDir: 'folder' in odItem,
		};

		if ('deleted' in odItem) {
			output.isDeleted = true;
		} else {
			output.updated_time = Number(moment(odItem.fileSystemInfo.lastModifiedDateTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ').format('x'));
		}

		return output;
	}

	private async statRaw_(path: string) {
		let item = null;
		try {
			item = await (this.api_ as any).execJson('GET', this.makePath_(path), this.itemFilter_());
		} catch (error) {
			if ((error as any).code === 'itemNotFound') return null;
			throw error;
		}
		return item;
	}

	public async stat(path: string) {
		const item = await this.statRaw_(path);
		if (!item) return null;
		return this.makeItem_(item);
	}

	public async setTimestamp(path: string, timestamp: number) {
		const body = {
			fileSystemInfo: {
				lastModifiedDateTime:
					`${moment
						.unix(timestamp / 1000)
						.utc()
						.format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`,
			},
		};
		const item = await (this.api_ as any).execJson('PATCH', this.makePath_(path), null, body);
		return this.makeItem_(item);
	}

	public async list(path: string, options: any = null) {
		options = { context: null, ...options };

		let query: any = { ...this.itemFilter_(), '$top': 1000 };
		let url = `${this.makePath_(path)}:/children`;

		if (options.context) {
			query = null;
			url = options.context;
		}

		const r = await (this.api_ as any).execJson('GET', url, query);

		return {
			hasMore: !!r['@odata.nextLink'],
			items: this.makeItems_(r.value),
			context: r['@odata.nextLink'],
		};
	}

	public async get(path: string, options: any = null) {
		if (!options) options = {};

		try {
			if (options.target === 'file') {
				const response = await (this.api_ as any).exec('GET', `${this.makePath_(path)}:/content`, null, null, options);
				return response;
			} else {
				const content = await (this.api_ as any).execText('GET', `${this.makePath_(path)}:/content`);
				return content;
			}
		} catch (error) {
			if ((error as any).code === 'itemNotFound') return null;
			throw error;
		}
	}

	public async mkdir(path: string) {
		let item = await this.stat(path);
		if (item) return item;

		const parentPath = dirname(path);
		item = await (this.api_ as any).execJson('POST', `${this.makePath_(parentPath)}:/children`, this.itemFilter_(), {
			name: basename(path),
			folder: {},
		});

		return this.makeItem_(item);
	}

	public async put(path: string, content: any, options: any = null) {
		if (!options) options = {};

		let byteSize: number = null;

		if (options.source === 'file') {
			byteSize = (await shim.fsDriver().stat(options.path)).size;
		} else {
			options.headers = { 'Content-Type': 'text/plain' };
			byteSize = Buffer.byteLength(content);
		}

		const uploadPath = byteSize < 4 * 1024 * 1024 ? `${this.makePath_(path)}:/content` : `${this.makePath_(path)}:/createUploadSession`;
		const response = await (this.api_ as any).exec('PUT', uploadPath, null, content, options);

		return response;
	}

	public delete(path: string) {
		return (this.api_ as any).exec('DELETE', this.makePath_(path));
	}

	public async move() {
		throw new Error('NOT WORKING');
	}

	public format() {
		throw new Error('Not implemented');
	}

	public async clearRoot() {
		const recurseItems = async (path: string) => {
			path = ltrimSlashes(path);
			const result = await this.list(this.fileApi_.fullPath(path));
			for (const item of result.items) {
				const fullPath = ltrimSlashes(`${path}/${item.path}`);
				if (item.isDir) {
					await recurseItems(fullPath);
				}
				await this.delete(this.fileApi_.fullPath(fullPath));
			}
		};

		await recurseItems('');
	}

	public async delta(path: string, options: any = null) {
		const getDirStats = async (path: string) => {
			let items: any[] = [];
			let context: any = null;

			while (true) {
				const result = await this.list(path, { includeDirs: false, context: context });
				items = items.concat(result.items);
				context = result.context;
				if (!result.hasMore) break;
			}

			return items;
		};

		return await basicDelta(path, getDirStats, options);
	}
}
