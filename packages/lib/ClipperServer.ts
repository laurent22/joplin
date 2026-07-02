import Setting from './models/Setting';
import Logger from '@joplin/utils/Logger';
import Api, { RequestFile } from './services/rest/Api';
import ApiResponse from './services/rest/ApiResponse';
import * as urlParser from 'url';
const { randomClipperPort, startPort } = require('./randomClipperPort');
const enableServerDestroy = require('server-destroy');
const multiparty = require('multiparty');

export enum StartState {
	Idle = 'idle',
	Starting = 'starting',
	Started = 'started',
}

type ClipperDispatch = (action: { type: string; [key: string]: unknown })=> void;

export default class ClipperServer {

	private logger_: Logger;
	private startState_: StartState = StartState.Idle;
	// .destroy is added by the `server-destroy` package
	private server_: (import('http').Server & { destroy?: ()=> void }) | null = null;
	private port_: number = null;
	private api_: Api = null;
	private dispatch_: ClipperDispatch;
	private enabled_ = true;

	private static instance_: ClipperServer = null;

	public constructor() {
		this.logger_ = new Logger();
	}

	public static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ClipperServer();
		return this.instance_;
	}

	public get api(): Api {
		return this.api_;
	}

	public enabled() {
		return this.enabled_;
	}

	public setEnabled(v: boolean) {
		this.enabled_ = v;

		if (!this.enabled_ && this.isRunning()) {
			void this.stop();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- actionApi is the optional handler bag for unknown API routes (e.g. from desktop's command service); its shape varies per consumer
	public initialize(actionApi: any = null) {
		this.api_ = new Api(() => {
			return Setting.value('api.token');
		}, (action: { type: string; [key: string]: unknown }) => { this.dispatch(action); }, actionApi);
	}

	public setLogger(l: Logger) {
		this.logger_ = l;
	}

	public logger() {
		return this.logger_;
	}

	public setDispatch(d: ClipperDispatch) {
		this.dispatch_ = d;
	}

	public dispatch(action: { type: string; [key: string]: unknown }) {
		if (!this.dispatch_) throw new Error('dispatch not set!');
		this.dispatch_(action);
	}

	public setStartState(v: StartState) {
		if (this.startState_ === v) return;
		this.startState_ = v;
		this.dispatch({
			type: 'CLIPPER_SERVER_SET',
			startState: v,
		});
	}

	public setPort(v: number) {
		if (this.port_ === v) return;
		this.port_ = v;
		this.dispatch({
			type: 'CLIPPER_SERVER_SET',
			port: v,
		});
	}

	public async findAvailablePort(): Promise<number> {
		const tcpPortUsed = require('tcp-port-used');

		let state = null;
		for (let i = 0; i < 10000; i++) {
			state = randomClipperPort(state, Setting.value('env'));
			const inUse = await tcpPortUsed.check(state.port);
			if (!inUse) return state.port;
		}

		throw new Error('All potential ports are in use or not available.');
	}

	public async isRunning() {
		const tcpPortUsed = require('tcp-port-used');
		const port = Setting.value('api.port') ? Setting.value('api.port') : startPort(Setting.value('env'));
		const inUse = await tcpPortUsed.check(port);
		return inUse ? port : 0;
	}

	public async start() {
		if (!this.enabled()) throw new Error('Cannot start clipper server because it is disabled');

		this.setPort(null);

		this.setStartState(StartState.Starting);

		const settingPort = Setting.value('api.port');

		try {
			const p = settingPort ? settingPort : await this.findAvailablePort();
			this.setPort(p);
		} catch (error) {
			this.setStartState(StartState.Idle);
			this.logger().error(error);
			return null;
		}

		this.server_ = require('http').createServer();

		this.server_.on('request', async (request: import('http').IncomingMessage, response: import('http').ServerResponse) => {
			const writeCorsHeaders = (code: number, contentType = 'application/json', additionalHeaders: Record<string, string | number> = null) => {
				const headers = {

					'Content-Type': contentType,
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
					'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
					...(additionalHeaders ? additionalHeaders : {}),
				};
				response.writeHead(code, headers);
			};

			const writeResponseJson = (code: number, object: unknown) => {
				writeCorsHeaders(code);
				response.write(JSON.stringify(object));
				response.end();
			};

			const writeResponseText = (code: number, text: string) => {
				writeCorsHeaders(code, 'text/plain');
				response.write(text);
				response.end();
			};

			const writeResponseInstance = (code: number, instance: ApiResponse) => {
				if (instance.type === 'attachment') {
					const filename = instance.attachmentFilename ? instance.attachmentFilename : 'file';
					const body = instance.body as { length: number };
					writeCorsHeaders(code, instance.contentType ? instance.contentType : 'application/octet-stream', {
						'Content-disposition': `attachment; filename=${filename}`,
						'Content-Length': body.length,
					});
					response.end(instance.body);
				} else {
					throw new Error('Not implemented');
				}
			};

			const writeResponse = (code: number, response: unknown) => {
				if (response instanceof ApiResponse) {
					writeResponseInstance(code, response);
				} else if (typeof response === 'string') {
					writeResponseText(code, response);
				} else if (response === null || response === undefined) {
					writeResponseText(code, '');
				} else {
					writeResponseJson(code, response);
				}
			};

			this.logger().info(`Request: ${request.method} ${request.url}`);

			const url = urlParser.parse(request.url, true);

			const execRequest = async (request: import('http').IncomingMessage, body = '', files: RequestFile[] = []) => {
				try {
					const response = await this.api_.route(request.method as Parameters<Api['route']>[0], url.pathname, url.query, body, files);
					writeResponse(200, response);
				} catch (error) {
					this.logger().error(error);
					const httpCode = error.httpCode ? error.httpCode : 500;
					const msg = [];
					if (httpCode >= 500) msg.push('Internal Server Error');
					if (error.message) msg.push(error.message);
					if (error.stack) msg.push(`\n\n${error.stack}`);

					writeResponse(httpCode, { error: msg.join(': ') });
				}
			};

			const contentType = request.headers['content-type'] ? request.headers['content-type'] : '';

			if (request.method === 'OPTIONS') {
				writeCorsHeaders(200);
				response.end();
			} else {
				if (contentType.indexOf('multipart/form-data') === 0) {
					const form = new multiparty.Form();

					form.parse(request, (error: (Error & { httpCode?: number }) | null, fields: Record<string, string[]>, files: Record<string, RequestFile[]>) => {
						if (error) {
							writeResponse(error.httpCode ? error.httpCode : 500, error.message);
							return;
						} else {
							void execRequest(request, fields && fields.props && fields.props.length ? fields.props[0] : '', files && files.data ? files.data : []);
						}
					});
				} else {
					if (request.method === 'POST' || request.method === 'PUT') {
						let body = '';

						request.on('data', (data: Buffer | string) => {
							body += data;
						});

						request.on('end', async () => {
							void execRequest(request, body);
						});
					} else {
						void execRequest(request);
					}
				}
			}
		});

		enableServerDestroy(this.server_);

		this.logger().info(`Starting Clipper server on port ${this.port_}`);

		this.server_.listen(this.port_, '127.0.0.1');

		this.setStartState(StartState.Started);

		// We return an empty promise that never resolves so that it's possible to `await` the server indefinitely.
		// This is used only in command-server.js
		return new Promise(() => {});
	}

	public async stop() {
		if (this.server_) {
			this.server_.destroy();
			this.server_ = null;
		}

		this.setStartState(StartState.Idle);
		this.setPort(null);
	}
}
