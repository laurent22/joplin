const { Logger } = require('lib/logger.js');
const { netUtils } = require('lib/net-utils.js');

const http = require('http');
const urlParser = require('url');
const enableServerDestroy = require('server-destroy');

class ResourceServer {
	constructor() {
		this.server_ = null;
		this.logger_ = new Logger();
		this.port_ = null;
		this.linkHandler_ = null;
		this.started_ = false;
	}

	setLogger(logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	started() {
		return this.started_;
	}

	baseUrl() {
		if (!this.port_) return '';
		return `http://127.0.0.1:${this.port_}`;
	}

	setLinkHandler(handler) {
		this.linkHandler_ = handler;
	}

	async start() {
		this.port_ = await netUtils.findAvailablePort([9167, 9267, 8167, 8267]);
		if (!this.port_) {
			this.logger().error('Could not find available port to start resource server. Please report the error at https://github.com/laurent22/joplin');
			return;
		}

		this.server_ = http.createServer();

		this.server_.on('request', async (request, response) => {
			const writeResponse = message => {
				response.write(message);
				response.end();
			};

			const url = urlParser.parse(request.url, true);
			let resourceId = url.pathname.split('/');
			if (resourceId.length < 2) {
				writeResponse(`Error: could not get resource ID from path name: ${url.pathname}`);
				return;
			}
			resourceId = resourceId[1];

			if (!this.linkHandler_) throw new Error('No link handler is defined');

			try {
				const done = await this.linkHandler_(resourceId, response);
				if (!done) throw new Error(`Unhandled resource: ${resourceId}`);
			} catch (error) {
				response.setHeader('Content-Type', 'text/plain');
				// eslint-disable-next-line require-atomic-updates
				response.statusCode = 400;
				response.write(error.message);
			}

			response.end();
		});

		this.server_.on('error', error => {
			this.logger().error('Resource server:', error);
		});

		this.server_.listen(this.port_);

		enableServerDestroy(this.server_);

		this.started_ = true;
	}

	stop() {
		if (this.server_) this.server_.destroy();
		this.server_ = null;
	}
}

module.exports = ResourceServer;
