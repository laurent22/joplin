import { createServer, IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';
import { Server } from 'http';
import Logger from './Logger';

const tcpPortUsed = require('tcp-port-used');
const maxPorts = 10;

const findAvailablePort = async (startPort: number) => {
	for (let i = 0; i < 100; i++) {
		const port = startPort + i;
		const inUse = await tcpPortUsed.check(port);
		if (!inUse) return port;
	}

	throw new Error(`All potential ports are in use or not available. Starting from port: ${startPort}`);
};

const findListenerPorts = async (startPort: number) => {
	const output: number[] = [];
	for (let i = 0; i < maxPorts; i++) {
		const port = startPort + i;
		const inUse = await tcpPortUsed.check(port);
		if (inUse) output.push(port);
	}

	return output;
};

const parseJson = (req: IncomingMessage): Promise<unknown> => {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', chunk => {
			body += chunk;
		});
		req.on('end', () => {
			try {
				resolve(JSON.parse(body));
			} catch (error) {
				reject(error);
			}
		});
	});
};

interface HttpError extends Error {
	httpCode: number;
}

export interface Message {
	action: string;
	data: object|number|string|null;
	sourcePort?: number;
}

type Response = string|number|object|boolean;

export const newHttpError = (httpCode: number, message = '') => {
	const error = (new Error(message) as HttpError);
	error.httpCode = httpCode;
	return error;
};

export type IpcMessageHandler = (message: Message)=> Promise<Response|void>;

export interface IpcServer {
	port: number;
	httpServer: Server;
}

interface StartServerOptions {
	logger?: Logger;
}

export const startServer = async (startPort: number, messageHandler: IpcMessageHandler, options: StartServerOptions|null = null): Promise<IpcServer> => {
	const port = await findAvailablePort(startPort);
	const logger = options && options.logger ? options.logger : new Logger();

	return new Promise<IpcServer>((resolve, reject) => {
		try {
			const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
				try {
					const message = await parseJson(req) as Message;
					if (!message.action) throw newHttpError(400, 'Missing "action" property in message');
					const response = await messageHandler(message);
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(response));
				} catch (error) {
					const httpError = error as HttpError;
					const httpCode = httpError.httpCode || 500;
					res.writeHead(httpCode, { 'Content-Type': 'text/plain' });
					res.end(`Error ${httpCode}: ${httpError.message}`);
				}
			});

			server.on('error', error => {
				if (logger) logger.error('Server error:', error);
			});

			server.listen(port, () => {
				resolve({
					httpServer: server,
					port,
				});
			});
		} catch (error) {
			reject(error);
		}
	});
};

export const stopServer = async (server: IpcServer) => {
	return new Promise((resolve, reject) => {
		server.httpServer.close((error) => {
			if (error) {
				reject(error);
			} else {
				resolve(null);
			}
		});
	});
};

interface SendMessageOutput {
	port: number;
	response: Response;
}

export interface SendMessageOptions {
	logger?: Logger;
	sendToSpecificPortOnly?: boolean;
}

export const sendMessage = async (startPort: number, message: Message, options: SendMessageOptions|null = null) => {
	const output: SendMessageOutput[] = [];
	const ports = await findListenerPorts(startPort);
	const logger = options && options.logger ? options.logger : new Logger();
	const sendToSpecificPortOnly = !!options && !!options.sendToSpecificPortOnly;

	for (const port of ports) {
		if (sendToSpecificPortOnly && port !== startPort) continue;
		if (message.sourcePort === port) continue;

		try {
			const response = await fetch(`http://localhost:${port}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(message),
			});

			if (!response.ok) {
				// It means the server doesn't support this particular message - so just skip it
				if (response.status === 404) continue;
				const text = await response.text();
				throw new Error(`Request failed: on port ${port}: ${text}`);
			}

			output.push({
				port,
				response: await response.json(),
			});
		} catch (error) {
			logger.error(`Could not send message on port ${port}:`, error);
		}
	}

	return output;
};
