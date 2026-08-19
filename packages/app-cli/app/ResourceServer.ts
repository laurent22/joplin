import Logger, { LoggerWrapper } from '@joplin/utils/Logger';
import { findAvailablePort } from '@joplin/lib/net-utils';
import * as http from 'http';
import * as urlParser from 'url';
const enableServerDestroy = require('server-destroy');

type LinkHandler = (resourceId: string, response: http.ServerResponse)=> Promise<boolean>;

class ResourceServer {
	private server_: http.Server | null;
	private logger_: LoggerWrapper;
	private port_: number | null;
	private linkHandler_: LinkHandler | null;
	private started_: boolean;

	public constructor() {
		this.server_ = null;
		this.logger_ = new Logger();
		this.port_ = null;
		this.linkHandler_ = null;
		this.started_ = false;
	}

	public setLogger(logger: LoggerWrapper) {
		this.logger_ = logger;
	}

	public logger() {
		return this.logger_;
	}

	public started() {
		return this.started_;
	}

	public baseUrl() {
		if (!this.port_) return '';
		return `http://127.0.0.1:${this.port_}`;
	}

	public setLinkHandler(handler: LinkHandler) {
		this.linkHandler_ = handler;
	}

	public async start() {
		this.port_ = await findAvailablePort(require('tcp-port-used'), [9167, 9267, 8167, 8267]);
		if (!this.port_) {
			this.logger().error('Could not find available port to start resource server. Please report the error at https://github.com/laurent22/joplin');
			return;
		}

		this.server_ = http.createServer();

		this.server_.on('request', async (request, response) => {
			const writeResponse = (message: string) => {
				response.write(message);
				response.end();
			};

			const url = urlParser.parse(request.url, true);
			const pathParts = url.pathname.split('/');
			if (pathParts.length < 2) {
				writeResponse(`Error: could not get resource ID from path name: ${url.pathname}`);
				return;
			}
			const resourceId = pathParts[1];

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

	public stop() {
		if (this.server_) (this.server_ as http.Server & { destroy: ()=> void }).destroy();
		this.server_ = null;
	}
}

export default ResourceServer;
