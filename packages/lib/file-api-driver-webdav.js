const { basicDelta } = require('./file-api');
const { rtrimSlashes, ltrimSlashes } = require('./path-utils');
const JoplinError = require('./JoplinError').default;
const Setting = require('./models/Setting').default;
const checkProviderIsSupported = require('./utils/webDAVUtils').default;

class FileApiDriverWebDav {
	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	requestRepeatCount() {
		return 3;
	}

	lastRequests() {
		return this.api().lastRequests();
	}

	clearLastRequests() {
		return this.api().clearLastRequests();
	}

	async stat(path) {
		try {
			const result = await this.api().execPropFind(path, 0, ['d:getlastmodified', 'd:resourcetype']);

			const resource = this.api().objectFromJson(result, ['d:multistatus', 'd:response', 0]);
			return this.statFromResource_(resource, path);
		} catch (error) {
			if (error.code === 404) return null;
			throw error;
		}
	}

	statFromResource_(resource, path) {
		// WebDAV implementations are always slightly different from one server to another but, at the minimum,
		// a resource should have a propstat key - if not it's probably an error.
		const propStat = this.api().arrayFromJson(resource, ['d:propstat']);
		if (!Array.isArray(propStat)) throw new Error(`Invalid WebDAV resource format: ${JSON.stringify(resource)}`);

		// Disabled for now to try to fix this: https://github.com/laurent22/joplin/issues/624
		//
		// const httpStatusLine = this.api().stringFromJson(resource, ['d:propstat',0,'d:status', 0]);
		// if ( typeof httpStatusLine === 'string' && httpStatusLine.indexOf('404') >= 0 ) throw  new JoplinError(resource, 404);

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
			if (error.code === 'stringNotFound') {
				// OK - the logic to handle this is below
			} else {
				throw error;
			}
		}

		// Note: Not all WebDAV servers return a getlastmodified date (eg. Seafile, which doesn't return the
		// property for folders) so we can only throw an error if it's a file.
		if (!lastModifiedString && !isDir) throw new Error(`Could not get lastModified date for resource: ${JSON.stringify(resource)}`);
		const lastModifiedDate = lastModifiedString ? new Date(lastModifiedString) : new Date();
		if (isNaN(lastModifiedDate.getTime())) throw new Error(`Invalid date: ${lastModifiedString}`);

		return {
			path: path,
			updated_time: lastModifiedDate.getTime(),
			isDir: isDir,
		};
	}

	async setTimestamp() {
		throw new Error('Not implemented'); // Not needed anymore
	}

	async delta(path, options) {
		const getDirStats = async path => {
			const result = await this.list(path, { includeDirs: false });
			return result.items;
		};

		return await basicDelta(path, getDirStats, options);
	}

	// A file href, as found in the result of a PROPFIND, can be either an absolute URL or a
	// relative URL (an absolute URL minus the protocol and domain), while the sync algorithm
	// works with paths relative to the base URL.
	hrefToRelativePath_(href, baseUrl, relativeBaseUrl) {
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

	statsFromResources_(resources) {
		const relativeBaseUrl = this.api().relativeBaseUrl();
		const baseUrl = this.api().baseUrl();
		const output = [];
		for (let i = 0; i < resources.length; i++) {
			const resource = resources[i];
			const href = this.api().stringFromJson(resource, ['d:href', 0]);
			const path = this.hrefToRelativePath_(href, baseUrl, relativeBaseUrl);
			// if (href.indexOf(relativeBaseUrl) !== 0) throw new Error('Path "' + href + '" not inside base URL: ' + relativeBaseUrl);
			// const path = rtrimSlashes(ltrimSlashes(href.substr(relativeBaseUrl.length)));
			if (path === '') continue; // The list of resources includes the root dir too, which we don't want
			const stat = this.statFromResource_(resources[i], path);
			output.push(stat);
		}
		return output;
	}

	async list(path) {
		// See mkdir() call for explanation about trailing slash
		const result = await this.api().execPropFind(!path.endsWith('/') ? `${path}/` : path, 1, ['d:getlastmodified', 'd:resourcetype']);

		const resources = this.api().arrayFromJson(result, ['d:multistatus', 'd:response']);

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
			context: null,
		};
	}

	async get(path, options) {
		if (!options) options = {};
		if (!options.responseFormat) options.responseFormat = 'text';
		try {
			const response = await this.api().exec('GET', path, null, null, options);

			// This is awful but instead of a 404 Not Found, Microsoft IIS returns an HTTP code 200
			// with a response body "The specified file doesn't exist." for non-existing files,
			// so we need to check for this.
			if (response === 'The specified file doesn\'t exist.') throw new JoplinError(response, 404);
			return response;
		} catch (error) {
			if (error.code !== 404) throw error;
			return null;
		}
	}

	async mkdir(path) {
		try {
			// RFC wants this, and so does NGINX. Not having the trailing slash means that some
			// WebDAV implementations will redirect to a URL with "/". However, when doing so
			// in React Native, the auth headers, etc. are lost so we need to avoid this.
			// https://github.com/facebook/react-native/issues/929
			if (!path.endsWith('/')) path = `${path}/`;
			await this.api().exec('MKCOL', path);
		} catch (error) {
			if (error.code === 405) return; // 405 means that the collection already exists (Method Not Allowed)

			// 409 should only be returned if a parent path does not exists (eg. when trying to create a/b/c when a/b does not exist)
			// however non-compliant servers (eg. Microsoft IIS) also return this code when the directory already exists. So here, if
			// we get this code, verify that indeed the directory already exists and exit if it does.
			if (error.code === 409) {
				const stat = await this.stat(path);
				if (stat) return;
			}

			throw error;
		}
	}

	async put(path, content, options = null) {
		return await this.api().exec('PUT', path, content, null, options);
	}

	async delete(path) {
		try {
			await this.api().exec('DELETE', path);
		} catch (error) {
			if (error.code !== 404) throw error;
		}
	}

	async move(oldPath, newPath) {
		await this.api().exec('MOVE', oldPath, null, {
			Destination: `${this.api().baseUrl()}/${newPath}`,
			Overwrite: 'T',
		});
	}

	format() {
		throw new Error('Not supported');
	}

	async clearRoot() {
		await this.delete('');
		await this.mkdir('');
	}

	initialize() {
		checkProviderIsSupported(Setting.value('sync.6.path'));
	}
}

module.exports = { FileApiDriverWebDav };
