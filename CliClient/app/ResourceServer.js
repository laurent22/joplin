import { _ } from 'lib/locale.js'
import { Logger } from 'lib/logger.js';
import { Resource } from 'lib/models/resource.js';
import { netUtils } from 'lib/net-utils.js'

const http = require("http");
const urlParser = require("url");
const enableServerDestroy = require('server-destroy');

class ResourceServer {

	constructor() {
		this.server_ = null;
		this.logger_ = new Logger();
		this.port_ = null;
	}

	setLogger(logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	baseUrl() {
		if (!this.port_) return '';
		return 'http://127.0.0.1:' + this.port_;
	}

	async start() {
		this.port_ = await netUtils.findAvailablePort([9167, 9267, 8167, 8267]);
		if (!this.port_) {	
			this.logger().error('Could not find available port to start resource server. Please report the error at https://github.com/laurent22/joplin');
			return;
		}

		this.server_ = http.createServer();

		this.server_.on('request', async (request, response) => {

			const writeResponse = (message) => {
				response.write(message);
				response.end();
			}

			const url = urlParser.parse(request.url, true);
			let resourceId = url.pathname.split('/');
			if (resourceId.length < 2) {
				writeResponse('Error: could not get resource ID from path name: ' + url.pathname);
				return;
			}
			resourceId = resourceId[1];

			try {
				let resource = await Resource.loadByPartialId(resourceId);
				if (!resource.length) throw new Error('No resource with ID ' + resourceId);
				if (resource.length > 2) throw new Error('More than one resource match ID ' + resourceId); // That's very unlikely
				resource = resource[0];
				if (resource.mime) response.setHeader('Content-Type', resource.mime);
				writeResponse(await Resource.content(resource));
			} catch (error) {
				response.setHeader('Content-Type', 'text/plain');
				response.statusCode = 400;
				writeResponse('Error: could not retrieve resource: ' + error.message);
			}
		});

		this.server_.on('error', (error) => {
			this.logger().error('Resource server:', error);
		});

		this.server_.listen(this.port_);

		enableServerDestroy(this.server_);
	}

	stop() {
		if (this.server_) this.server_.destroy();
		this.server_ = null;
	}

}

module.exports = ResourceServer;