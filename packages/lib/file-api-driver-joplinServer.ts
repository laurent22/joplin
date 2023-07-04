import { MultiPutItem } from './file-api';
import JoplinError from './JoplinError';
import JoplinServerApi from './JoplinServerApi';
import { trimSlashes } from './path-utils';
import { Lock, LockClientType, LockType } from './services/synchronizer/LockHandler';

// All input paths should be in the format: "path/to/file". This is converted to
// "root:/path/to/file:" when doing the API call.

export default class FileApiDriverJoplinServer {

	private api_: JoplinServerApi;

	public constructor(api: JoplinServerApi) {
		this.api_ = api;
	}

	public async initialize(basePath: string) {
		const pieces = trimSlashes(basePath).split('/');
		if (!pieces.length) return;

		const parent: string[] = [];

		for (let i = 0; i < pieces.length; i++) {
			const p = pieces[i];
			const subPath = parent.concat(p).join('/');
			parent.push(p);
			await this.mkdir(subPath);
		}
	}

	public api() {
		return this.api_;
	}

	public get supportsMultiPut() {
		return true;
	}

	public get supportsAccurateTimestamp() {
		return true;
	}

	public get supportsLocks() {
		return true;
	}

	public requestRepeatCount() {
		return 3;
	}

	private metadataToStat_(md: any, path: string, isDeleted = false, rootPath: string) {
		const output = {
			path: rootPath ? path.substr(rootPath.length + 1) : path,
			updated_time: md.updated_time,
			jop_updated_time: md.jop_updated_time,
			isDir: false,
			isDeleted: isDeleted,
		};

		return output;
	}

	private metadataToStats_(mds: any[], rootPath: string) {
		const output = [];
		for (let i = 0; i < mds.length; i++) {
			output.push(this.metadataToStat_(mds[i], mds[i].name, false, rootPath));
		}
		return output;
	}

	// Transforms a path such as "Apps/Joplin/file.txt" to a complete a complete
	// API URL path: "api/items/root:/Apps/Joplin/file.txt:"
	private apiFilePath_(p: string) {
		return `api/items/root:/${trimSlashes(p)}:`;
	}

	public async stat(path: string) {
		try {
			const response = await this.api().exec('GET', this.apiFilePath_(path));
			return this.metadataToStat_(response, path, false, '');
		} catch (error) {
			if (error.code === 404) return null;
			throw error;
		}
	}

	public async delta(path: string, options: any) {
		const context = options ? options.context : null;
		let cursor = context ? context.cursor : null;

		while (true) {
			try {
				const query = cursor ? { cursor } : {};
				const response = await this.api().exec('GET', `${this.apiFilePath_(path)}/delta`, query);
				const stats = response.items
					.filter((item: any) => {
						// We don't need to know about lock changes, since this
						// is handled by the LockHandler.
						if (item.item_name.indexOf('locks/') === 0) return false;

						// We don't need to sync what's in the temp folder
						if (item.item_name.indexOf('temp/') === 0) return false;

						// Although we sync the content of .resource, whether we
						// fetch or upload data to it is driven by the
						// associated resource item (.md) file. So at this point
						// we don't want to automatically fetch from it.
						if (item.item_name.indexOf('.resource/') === 0) return false;
						return true;
					})
					.map((item: any) => {
						return this.metadataToStat_(item, item.item_name, item.type === 3, '');
					});

				const output = {
					items: stats,
					hasMore: response.has_more,
					context: { cursor: response.cursor },
				};

				return output;
			} catch (error) {
				// If there's an error related to an invalid cursor, clear the cursor and retry.
				if (cursor && error.code === 'resyncRequired') {
					cursor = null;
					continue;
				}
				throw error;
			}
		}
	}

	public async list(path: string, options: any = null) {
		options = {
			context: null,
			...options,
		};

		let isUsingWildcard = false;
		let searchPath = path;
		if (searchPath) {
			searchPath += '/*';
			isUsingWildcard = true;
		}

		const query = options.context?.cursor ? { cursor: options.context.cursor } : null;

		const results = await this.api().exec('GET', `${this.apiFilePath_(searchPath)}/children`, query);

		const newContext: any = {};
		if (results.cursor) newContext.cursor = results.cursor;

		return {
			items: this.metadataToStats_(results.items, isUsingWildcard ? path : ''),
			hasMore: results.has_more,
			context: newContext,
		} as any;
	}

	public async get(path: string, options: any) {
		if (!options) options = {};
		if (!options.responseFormat) options.responseFormat = 'text';
		try {
			const response = await this.api().exec('GET', `${this.apiFilePath_(path)}/content`, null, null, null, options);
			return response;
		} catch (error) {
			if (error.code !== 404) throw error;
			return null;
		}
	}

	public async mkdir(_path: string) {
		// This is a no-op because all items technically are at the root, but
		// they can have names such as ".resources/xxxxxxxxxx'
	}

	private isRejectedBySyncTargetError(error: any) {
		return error.code === 413 || error.code === 409 || error.httpCode === 413 || error.httpCode === 409;
	}

	public async put(path: string, content: any, options: any = null) {
		try {
			const output = await this.api().exec('PUT', `${this.apiFilePath_(path)}/content`, options && options.shareId ? { share_id: options.shareId } : null, content, {
				'Content-Type': 'application/octet-stream',
			}, options);
			return output;
		} catch (error) {
			if (this.isRejectedBySyncTargetError(error)) {
				throw new JoplinError(error.message, 'rejectedByTarget');
			}
			throw error;
		}
	}

	public async multiPut(items: MultiPutItem[], options: any = null) {
		const output = await this.api().exec('PUT', 'api/batch_items', null, { items: items }, null, options);

		for (const [, response] of Object.entries<any>(output.items)) {
			if (response.error && this.isRejectedBySyncTargetError(response.error)) {
				response.error.code = 'rejectedByTarget';
			}
		}

		return output;
	}

	public async delete(path: string) {
		return this.api().exec('DELETE', this.apiFilePath_(path));
	}

	public format() {
		throw new Error('Not supported');
	}

	// private lockClientTypeToId(clientType:AppType):number {
	// 	if (clientType === AppType.Desktop) return 1;
	// 	if (clientType === AppType.Mobile) return 2;
	// 	if (clientType === AppType.Cli) return 3;
	// 	throw new Error('Invalid client type: ' + clientType);
	// }

	// private lockTypeToId(lockType:LockType):number {
	// 	if (lockType === LockType.None) return 0; // probably not possible?
	// 	if (lockType === LockType.Sync) return 1;
	// 	if (lockType === LockType.Exclusive) return 2;
	// 	throw new Error('Invalid lock type: ' + lockType);
	// }

	// private lockClientIdTypeToType(clientType:number):AppType {
	// 	if (clientType === 1) return AppType.Desktop;
	// 	if (clientType === 2) return AppType.Mobile;
	// 	if (clientType === 3) return AppType.Cli;
	// 	throw new Error('Invalid client type: ' + clientType);
	// }

	// private lockIdToType(lockType:number):LockType {
	// 	if (lockType === 0) return LockType.None; // probably not possible?
	// 	if (lockType === 1) return LockType.Sync;
	// 	if (lockType === 2) return LockType.Exclusive;
	// 	throw new Error('Invalid lock type: ' + lockType);
	// }

	public async acquireLock(type: LockType, clientType: LockClientType, clientId: string): Promise<Lock> {
		return this.api().exec('POST', 'api/locks', null, {
			type,
			clientType,
			clientId: clientId,
		});
	}

	public async releaseLock(type: LockType, clientType: LockClientType, clientId: string) {
		await this.api().exec('DELETE', `api/locks/${type}_${clientType}_${clientId}`);
	}

	public async listLocks() {
		return this.api().exec('GET', 'api/locks');
	}

	public async clearRoot(path: string) {
		const response = await this.list(path);

		for (const item of response.items) {
			await this.delete(item.path);
		}

		await this.api().exec('POST', 'api/debug', null, { action: 'clearKeyValues' });

		if (response.has_more) throw new Error('has_more support not implemented');
	}
}
