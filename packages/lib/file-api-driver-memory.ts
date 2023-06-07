import time from './time';
const fs = require('fs-extra');
import { basicDelta, MultiPutItem } from './file-api';

export default class FileApiDriverMemory {

	private items_: any[];
	private deletedItems_: any[];

	public constructor() {
		this.items_ = [];
		this.deletedItems_ = [];
	}

	private encodeContent_(content: any) {
		if (content instanceof Buffer) {
			return content.toString('base64');
		} else {
			return Buffer.from(content).toString('base64');
		}
	}

	public get supportsMultiPut() {
		return true;
	}

	public get supportsAccurateTimestamp() {
		return true;
	}

	private decodeContent_(content: any) {
		return Buffer.from(content, 'base64').toString('utf-8');
	}

	public itemIndexByPath(path: string) {
		for (let i = 0; i < this.items_.length; i++) {
			if (this.items_[i].path === path) return i;
		}
		return -1;
	}

	public itemByPath(path: string) {
		const index = this.itemIndexByPath(path);
		return index < 0 ? null : this.items_[index];
	}

	public newItem(path: string, isDir = false) {
		const now = time.unixMs();
		return {
			path: path,
			isDir: isDir,
			updated_time: now, // In milliseconds!!
			// created_time: now, // In milliseconds!!
			content: '',
		};
	}

	public stat(path: string) {
		const item = this.itemByPath(path);
		return Promise.resolve(item ? { ...item } : null);
	}

	public async setTimestamp(path: string, timestampMs: number): Promise<any> {
		const item = this.itemByPath(path);
		if (!item) return Promise.reject(new Error(`File not found: ${path}`));
		item.updated_time = timestampMs;
	}

	public async list(path: string) {
		const output = [];

		for (let i = 0; i < this.items_.length; i++) {
			const item = this.items_[i];
			if (item.path === path) continue;
			if (item.path.indexOf(`${path}/`) === 0) {
				const s = item.path.substr(path.length + 1);
				if (s.split('/').length === 1) {
					const it = { ...item };
					it.path = it.path.substr(path.length + 1);
					output.push(it);
				}
			}
		}

		return Promise.resolve({
			items: output,
			hasMore: false,
			context: null,
		});
	}

	public async get(path: string, options: any) {
		const item = this.itemByPath(path);
		if (!item) return Promise.resolve(null);
		if (item.isDir) return Promise.reject(new Error(`${path} is a directory, not a file`));

		let output = null;
		if (options.target === 'file') {
			await fs.writeFile(options.path, Buffer.from(item.content, 'base64'));
		} else {
			const content = this.decodeContent_(item.content);
			output = Promise.resolve(content);
		}

		return output;
	}

	public async mkdir(path: string) {
		const index = this.itemIndexByPath(path);
		if (index >= 0) return;
		this.items_.push(this.newItem(path, true));
	}

	public async put(path: string, content: any, options: any = null) {
		if (!options) options = {};

		if (options.source === 'file') content = await fs.readFile(options.path);

		const index = this.itemIndexByPath(path);
		if (index < 0) {
			const item = this.newItem(path, false);
			item.content = this.encodeContent_(content);
			this.items_.push(item);
			return item;
		} else {
			this.items_[index].content = this.encodeContent_(content);
			this.items_[index].updated_time = time.unixMs();
			return this.items_[index];
		}
	}

	public async multiPut(items: MultiPutItem[], options: any = null) {
		const output: any = {
			items: {},
		};

		for (const item of items) {
			try {
				const processedItem = await this.put(`/root/${item.name}`, item.body, options);
				output.items[item.name] = {
					item: processedItem,
					error: null,
				};
			} catch (error) {
				output.items[item.name] = {
					item: null,
					error: error,
				};
			}
		}

		return output;
	}

	public async delete(path: string) {
		const index = this.itemIndexByPath(path);
		if (index >= 0) {
			const item = { ...this.items_[index] };
			item.isDeleted = true;
			item.updated_time = time.unixMs();
			this.deletedItems_.push(item);
			this.items_.splice(index, 1);
		}
	}

	public async move(oldPath: string, newPath: string): Promise<any> {
		const sourceItem = this.itemByPath(oldPath);
		if (!sourceItem) return Promise.reject(new Error(`Path not found: ${oldPath}`));
		await this.delete(newPath); // Overwrite if newPath already exists
		sourceItem.path = newPath;
	}

	public async format() {
		this.items_ = [];
	}

	public async delta(path: string, options: any = null) {
		const getStatFn = async (path: string) => {
			const output = this.items_.slice();
			for (let i = 0; i < output.length; i++) {
				const item = { ...output[i] };
				item.path = item.path.substr(path.length + 1);
				output[i] = item;
			}
			return output;
		};

		const output = await basicDelta(path, getStatFn, options);
		return output;
	}

	public async clearRoot() {
		this.items_ = [];
	}
}
