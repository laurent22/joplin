const queryString = require('query-string');

class WebApi {

	constructor(baseUrl, clientId) {
		this.baseUrl_ = baseUrl;
		this.clientId_ = clientId;
	}

	makeRequest(method, path, query, data) {
		let url = this.baseUrl_;
		if (path) url += '/' + path;
		if (query) url += '?' + queryString(query);
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

	exec(method, path, query, data) {
		let that = this;
		return new Promise(function(resolve, reject) {
			let r = that.makeRequest(method, path, query, data);

			fetch(r.url, r.options).then(function(response) {
				let responseClone = response.clone();
				return response.json().then(function(data) {
					resolve(data);
				})
				.catch(function(error) {
					responseClone.text().then(function(text) {
						reject('Cannot parse JSON: ' + text);
					});
				});
			})
			.then(function(data) {
				resolve(data);
			})
			.catch(function(error) {
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