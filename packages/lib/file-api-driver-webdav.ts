/* eslint-disable @typescript-eslint/no-explicit-any */
import { basicDelta } from './file-api';
import { rtrimSlashes, ltrimSlashes } from './path-utils';
import JoplinError from './JoplinError';
import Setting from './models/Setting';
import checkProviderIsSupported from './utils/webDAVUtils';
import WebDavApi from './WebDavApi';

export default class FileApiDriverWebDav {
	private api_: WebDavApi;

	public constructor(api: WebDavApi) {
		this.api_ = api;
	}

	public api() {
		return this.api_;
	}

	public requestRepeatCount() {
		return 3;
	}

	public lastRequests() {
		return this.api().lastRequests();
	}

	public clearLastRequests() {
		return this.api().clearLastRequests();
	}

	public async stat(path: string) {
		try {
			const result = await this.api().execPropFind(path, 0, ['d:getlastmodified', 'd:resourcetype']);

			const resource = this.api().objectFromJson(result, ['d:multistatus', 'd:response', 0]);
			return this.statFromResource_(resource, path);
		} catch (error) {
			if ((error as any).code === 404) return null;
			throw error;
		}
	}

	private statFromResource_(resource: any, path: string) {
		const propStat = this.api().arrayFromJson(resource, ['d:propstat']);
		if (!Array.isArray(propStat)) throw new Error(`Invalid WebDAV resource format: ${JSON.stringify(resource)}`);

		const resourceTypes = this.api().resourcePropByName(resource, 'array', 'd:resourcetype');
		let isDir = false;
		if (Array.isArray(resourceTypes)) {
			for (let i = 0; i < resourceTypes.length; i++) {
				const t = resourceTypes[i];
				if (typeof t === 'object' && 'd:collection' in t) {
					isDir = true;
					break;
				}
			}
		}

		let lastModifiedString = null;

		try {
			lastModifiedString = this.api().resourcePropByName(resource, 'string', 'd:getlastmodified');
		} catch (error) {
			if ((error as any).code === 'stringNotFound') {
				// OK
			} else {
				throw error;
			}
		}

		if (!lastModifiedString && !isDir) throw new Error(`Could not get lastModified date for resource: ${JSON.stringify(resource)}`);
		const lastModifiedDate = lastModifiedString ? new Date(lastModifiedString) : new Date();
		if (isNaN(lastModifiedDate.getTime())) throw new Error(`Invalid date: ${lastModifiedString}`);

		return {
			path: path,
			updated_time: lastModifiedDate.getTime(),
			isDir: isDir,
		};
	}

	public async setTimestamp() {
		throw new Error('Not implemented'); // Not needed anymore
	}

	public async delta(path: string, options: any) {
		const getDirStats = async (path: string) => {
			const result = await this.list(path);
			return result.items;
		};

		return await basicDelta(path, getDirStats, options);
	}

	private hrefToRelativePath_(href: string, baseUrl: string, relativeBaseUrl: string) {
		let output = '';
		if (href.indexOf(baseUrl) === 0) {
			output = href.substr(baseUrl.length);
		} else if (href.indexOf(relativeBaseUrl) === 0) {
			output = href.substr(relativeBaseUrl.length);
		} else if (decodeURIComponent(href).indexOf(decodeURIComponent(relativeBaseUrl)) === 0) {
			output = decodeURIComponent(href).substring(decodeURIComponent(relativeBaseUrl).length);
		} else {
			throw new Error(`href ${href} not in baseUrl ${baseUrl} nor relativeBaseUrl ${relativeBaseUrl}`);
		}

		return rtrimSlashes(ltrimSlashes(output));
	}

	private statsFromResources_(resources: any[]) {
		const relativeBaseUrl = this.api().relativeBaseUrl();
		const baseUrl = this.api().baseUrl();
		const output = [];
		for (let i = 0; i < resources.length; i++) {
			const resource = resources[i];
			const href = this.api().stringFromJson(resource, ['d:href', 0]);
			if (href === null) continue;
			const path = this.hrefToRelativePath_(href, baseUrl, relativeBaseUrl);
			if (path === '') continue; // The list of resources includes the root dir too, which we don't want
			const stat = this.statFromResource_(resources[i], path);
			output.push(stat);
		}
		return output;
	}

	public async list(path: string) {
		const result = await this.api().execPropFind(!path.endsWith('/') ? `${path}/` : path, 1, ['d:getlastmodified', 'd:resourcetype']);

		const resources = this.api().arrayFromJson(result, ['d:multistatus', 'd:response']);

		if (!resources) {
			return {
				items: [],
				hasMore: false,
				context: null as any,
			};
		}

		const stats = this.statsFromResources_(resources).map((stat) => {
			if (path && stat.path.indexOf(`${path}/`) === 0) {
				const s = stat.path.substr(path.length + 1);
				if (s.split('/').length === 1) {
					return {
						...stat,
						path: stat.path.substr(path.length + 1),
					};
				}
			}
			return stat;
		}).filter((stat) => {
			return stat.path !== rtrimSlashes(path);
		});

		return {
			items: stats,
			hasMore: false,
			context: null as any,
		};
	}

	public async get(path: string, options: any) {
		if (!options) options = {};
		if (!options.responseFormat) options.responseFormat = 'text';
		try {
			const response = await this.api().exec('GET', path, null, null, options);

			if (response === 'The specified file doesn\'t exist.') throw new JoplinError(response, 404);
			return response;
		} catch (error) {
			if ((error as any).code !== 404) throw error;
			return null;
		}
	}

	public async mkdir(path: string) {
		try {
			if (!path.endsWith('/')) path = `${path}/`;
			await this.api().exec('MKCOL', path);
		} catch (error) {
			if ((error as any).code === 405) return; // 405 means that the collection already exists (Method Not Allowed)

			if ((error as any).code === 409) {
				const stat = await this.stat(path);
				if (stat) return;
			}

			throw error;
		}
	}

	public async put(path: string, content: any, options: any = null) {
		return await this.api().exec('PUT', path, content, null, options);
	}

	public async delete(path: string) {
		try {
			await this.api().exec('DELETE', path);
		} catch (error) {
			if ((error as any).code !== 404) throw error;
		}
	}

	public async move(oldPath: string, newPath: string) {
		await this.api().exec('MOVE', oldPath, null, {
			Destination: `${this.api().baseUrl()}/${newPath}`,
			Overwrite: 'T',
		});
	}

	public format() {
		throw new Error('Not supported');
	}

	public async clearRoot() {
		await this.delete('');
		await this.mkdir('');
	}

	public initialize() {
		checkProviderIsSupported(Setting.value('sync.6.path'));
	}
}
