import { basicDelta, DeltaOptions, FileApi } from './file-api';
import { dirname, basename } from './path-utils';
import PCloudApi, { PCloudMetadata } from './pcloud-api';

interface ItemStat {
	path: string;
	isDir: boolean;
	updated_time: number;
	isDeleted?: boolean;
}

interface ListOptions {
	context?: string;
	includeDirs?: boolean;
}

interface GetOptions {
	target?: 'file';
	path?: string;
}

interface PutOptions {
	source?: 'file';
	path?: string;
	headers?: Record<string, string>;
}

// The pCloud result codes that mean that the requested file or folder does
// not exist (handled along with HTTP 404):
// - 2002: A component of the parent directory path does not exist
// - 2005: Directory (or file) does not exist
// - 2009: File not found (eg returned by "getfilelink" on a file that has
//   not been created yet, such as info.json on a new sync target)
// - 2055: File or folder not found (eg returned by "stat" on a missing path)
const notFoundErrorCodes = [404, 2002, 2005, 2009, 2055];

interface ListResult {
	items: ItemStat[];
	hasMore: boolean;
	context: string | null;
}

export default class FileApiDriverPCloud {

	private api_: PCloudApi;
	private fileApi_?: FileApi;

	public constructor(api: PCloudApi) {
		this.api_ = api;
	}

	public api() {
		return this.api_;
	}

	public requestRepeatCount() {
		return 3;
	}

	private makePath_(path: string) {
		if (!path) return '/';
		return path.indexOf('/') === 0 ? path : `/${path}`;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- error is a network/API error augmented with a numeric code field by PCloudApi
	private isNotFoundError_(error: any) {
		return error && notFoundErrorCodes.indexOf(Number(error.code)) >= 0;
	}

	private makeItem_(md: PCloudMetadata): ItemStat {
		const updatedTime = new Date(md.modified).getTime();
		return {
			path: md.name,
			isDir: !!md.isfolder,
			// pCloud timestamps are UTC strings with second precision,
			// eg "Thu, 19 Sep 2013 07:31:46 +0000"
			updated_time: isNaN(updatedTime) ? 0 : updatedTime,
		};
	}

	private makeItems_(mds: PCloudMetadata[]) {
		const output = [];
		for (let i = 0; i < mds.length; i++) {
			output.push(this.makeItem_(mds[i]));
		}
		return output;
	}

	public async stat(path: string): Promise<ItemStat> {
		try {
			const md = await this.api().stat(this.makePath_(path));
			return this.makeItem_(md);
		} catch (error) {
			if (this.isNotFoundError_(error)) return null;
			throw error;
		}
	}

	public async setTimestamp() {
		throw new Error('Not implemented'); // Not needed anymore
	}

	public async list(path: string, _options: ListOptions = null): Promise<ListResult> {
		const md = await this.api().listFolder(this.makePath_(path));
		const contents = md && md.contents ? md.contents : [];

		return {
			items: this.makeItems_(contents),
			hasMore: false,
			context: null,
		};
	}

	public async get(path: string, options: GetOptions = null) {
		if (!options) options = {};

		try {
			if (options.target === 'file') {
				return await this.api().downloadToFile(this.makePath_(path), options.path);
			} else {
				return await this.api().downloadToString(this.makePath_(path));
			}
		} catch (error) {
			if (this.isNotFoundError_(error)) return null;
			throw error;
		}
	}

	public async put(path: string, content: string, options: PutOptions = null) {
		if (!options) options = {};

		const parentDir = dirname(path);
		const name = basename(path);

		try {
			await this.api().uploadFile(this.makePath_(parentDir), name, content, options);
		} catch (error) {
			// The upload fails if the parent directory does not exist, in
			// which case create it and repeat the upload once.
			if (error && Number(error.code) === 2002) {
				await this.mkdir(parentDir);
				await this.api().uploadFile(this.makePath_(parentDir), name, content, options);
			} else {
				throw error;
			}
		}
	}

	public async mkdir(path: string) {
		// createfolderifnotexists fails if a component of the parent path does
		// not exist (error 2002), so create the hierarchy progressively. The
		// call is idempotent, so calling it on existing directories is a no-op.
		const pieces = path.split('/').filter(p => !!p);
		let currentPath = '';
		for (let i = 0; i < pieces.length; i++) {
			currentPath += `/${pieces[i]}`;
			await this.api().createFolderIfNotExists(currentPath);
		}

		return this.stat(path);
	}

	public async delete(path: string) {
		const statItem = await this.stat(path);

		// Deleting a non-existing item is ok - noop
		if (!statItem) return;

		try {
			if (statItem.isDir) {
				await this.api().deleteFolderRecursive(this.makePath_(path));
			} else {
				await this.api().deleteFile(this.makePath_(path));
			}
		} catch (error) {
			if (this.isNotFoundError_(error)) return;
			throw error;
		}
	}

	public async move() {
		// Moving items is not used anymore by the synchronizer (it is done as
		// a delete + put), so this is not implemented.
		throw new Error('Not implemented');
	}

	public format() {
		throw new Error('Not implemented');
	}

	public async clearRoot() {
		const baseDir = this.makePath_(this.fileApi_.baseDir());

		try {
			await this.api().deleteFolderRecursive(baseDir);
		} catch (error) {
			if (!this.isNotFoundError_(error)) throw error;
		}

		await this.api().createFolderIfNotExists(baseDir);
	}

	public async delta(path: string, options: DeltaOptions = null) {
		const getDirStats = async (path: string) => {
			let items: ItemStat[] = [];
			let context = null;

			while (true) {
				const result = await this.list(path, { includeDirs: false, context: context });
				items = items.concat(result.items);
				context = result.context;
				if (!result.hasMore) break;
			}

			return items;
		};

		// Note: pCloud also has a native "diff" end point, which provides a
		// change feed with a cursor. Using it instead of basicDelta would be a
		// possible optimisation.
		return await basicDelta(path, getDirStats, options);
	}
}
