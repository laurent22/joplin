const Api = require('lib/services/rest/Api');

export default class SandboxJoplinApi {

	private api_: any = new Api();

	private serializeApiBody(body: any) {
		if (typeof body !== 'string') { return JSON.stringify(body); }
		return body;
	}

	get(path: string, query: any = null) {
		return this.api_.route('GET', path, query);
	}

	post(path: string, query: any = null, body: any = null, files: any[] = null) {
		return this.api_.route('POST', path, query, this.serializeApiBody(body), files);
	}

	put(path: string, query: any = null, body: any = null, files: any[] = null) {
		return this.api_.route('PUT', path, query, this.serializeApiBody(body), files);
	}

	delete(path: string, query: any = null) {
		return this.api_.route('DELETE', path, query);
	}
}
