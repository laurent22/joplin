import { Log } from 'src/log.js';
import { stringify } from 'query-string';

class WebApi {

	constructor(baseUrl) {
		this.baseUrl_ = baseUrl;
	}

	makeRequest(method, path, query, data) {
		let url = this.baseUrl_;
		if (path) url += '/' + path;
		if (query) url += '?' + stringify(query);
		let options = {};
		options.method = method.toUpperCase();
		if (data) {
			var formData = new FormData();
			for (var key in data) {
				if (!data.hasOwnProperty(key)) continue;
				formData.append(key, data[key]);
			}
			options.body = formData;
		}

		return {
			url: url,
			options: options
		};
	}

	static toCurl(r, data) {
		let o = r.options;
		let cmd = [];
		cmd.push('curl');
		if (o.method == 'PUT') cmd.push('-X PUT');
		if (o.method == 'PATCH') cmd.push('-X PATCH');
		if (o.method == 'DELETE') cmd.push('-X DELETE');
		if (o.method != 'GET' && o.method != 'DELETE') {
			cmd.push("--data '" + stringify(data) + "'");
		}
		cmd.push(r.url);
		return cmd.join(' ');
	}

	exec(method, path, query, data) {
		let that = this;
		return new Promise(function(resolve, reject) {
			let r = that.makeRequest(method, path, query, data);

			Log.debug(WebApi.toCurl(r, data));

			fetch(r.url, r.options).then(function(response) {
				let responseClone = response.clone();
				return response.json().then(function(data) {
					if (data && data.error) {
						reject(new Error(data.error));
					} else {
						resolve(data);
					}
				}).catch(function(error) {
					responseClone.text().then(function(text) {
						reject(new Error('Cannot parse JSON: ' + text));
					});
				});
			}).then(function(data) {
				resolve(data);
			}).catch(function(error) {
				reject(error);
			});
		});
	}

	get(path, query) {
		return this.exec('GET', path, query);
	}

	post(path, query, data) {
		return this.exec('POST', path, query, data);
	}

	delete(path, query) {
		return this.exec('DELETE', path, query);
	}

}

export { WebApi };