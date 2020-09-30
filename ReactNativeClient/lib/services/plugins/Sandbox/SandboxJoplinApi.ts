const Api = require('lib/services/rest/Api');

/**
 * This module provides access to the Joplin data API: https://joplinapp.org/api/
 * This is the main way to retrieve data, such as notes, notebooks, tags, etc.
 * or to update them or delete them.
 */
export default class SandboxJoplinApi {

	private api_: any = new Api();

	private serializeApiBody(body: any) {
		if (typeof body !== 'string') { return JSON.stringify(body); }
		return body;
	}

	async get(path: string, query: any = null) {
		return this.api_.route('GET', path, query);
	}

	async post(path: string, query: any = null, body: any = null, files: any[] = null) {
		return this.api_.route('POST', path, query, this.serializeApiBody(body), files);
	}

	async put(path: string, query: any = null, body: any = null, files: any[] = null) {
		return this.api_.route('PUT', path, query, this.serializeApiBody(body), files);
	}

	async delete(path: string, query: any = null) {
		return this.api_.route('DELETE', path, query);
	}
}
