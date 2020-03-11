
'use strict';

const YouTubeService = require('./services/YouTubeService');



class PluginEnvironment {

	constructor(md, options) {
		this.md = md;
		this.options = Object.assign(this.getDefaultOptions(), options);

		this._initServices();
	}

	_initServices() {
		let defaultServiceBindings = {
			'youtube': YouTubeService,

		};

		let serviceBindings = Object.assign({}, defaultServiceBindings, this.options.services);
		let services = {};
		for (let serviceName of Object.keys(serviceBindings)) {
			let _serviceClass = serviceBindings[serviceName];
			services[serviceName] = new _serviceClass(serviceName, this.options[serviceName], this);
		}

		this.services = services;
	}

	getDefaultOptions() {
		return {
			outputPlayerSize: true,
			allowFullScreen: true,
			filterUrl: null,
		};
	}

}


module.exports = PluginEnvironment;
