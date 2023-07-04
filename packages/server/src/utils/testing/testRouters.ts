/* eslint-disable no-console */

import * as fs from 'fs-extra';

require('source-map-support').install();

const { stringify } = require('query-string');

const execCommand = function(command: string, returnStdErr = false): Promise<string> {
	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		exec(command, (error: any, stdout: any, stderr: any) => {
			if (error) {
				if (error.signal === 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				const output = [];
				if (stdout.trim()) output.push(stdout.trim());
				if (returnStdErr && stderr.trim()) output.push(stderr.trim());
				resolve(output.join('\n\n'));
			}
		});
	});
};

async function sleep(seconds: number) {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	return new Promise((resolve: Function) => {
		setTimeout(() => {
			resolve();
		}, seconds * 1000);
	});
}

async function curl(method: string, path: string, query: object = null, body: any = null, headers: any = null, formFields: string[] = null, options: any = {}): Promise<any> {
	const curlCmd: string[] = ['curl'];

	if (options.verbose) curlCmd.push('-v');
	if (options.output) curlCmd.push(`--output "${options.output}"`);

	if ((['PUT', 'DELETE', 'PATCH'].indexOf(method) >= 0) || (method === 'POST' && !formFields && !body)) {
		curlCmd.push('-X');
		curlCmd.push(method);
	}

	if (typeof body === 'object' && body) {
		curlCmd.push('--data');
		curlCmd.push(`'${JSON.stringify(body)}'`);
	}

	if (formFields) {
		for (const f of formFields) {
			curlCmd.push('-F');
			curlCmd.push(`'${f}'`);
		}
	}

	if (options.uploadFile) {
		curlCmd.push('--data-binary');
		curlCmd.push(`@${options.uploadFile}`);
		headers['Content-Type'] = 'application/octet-stream';
	}

	if (!headers && body) headers = {};

	if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

	if (headers) {
		for (const k in headers) {
			curlCmd.push('--header');
			curlCmd.push(`"${k}: ${headers[k]}"`);
		}
	}

	curlCmd.push(`http://localhost:22300/${path}${query ? `?${stringify(query)}` : ''}`);

	console.info(`Running: ${curlCmd.join(' ')}`);

	const result = await execCommand(curlCmd.join(' '), !!options.verbose);
	if (options.verbose) return result;
	return result ? JSON.parse(result) : null;
}

function extractCurlResponse(rawResult: string) {
	const splitted = rawResult.split('\n');
	return splitted.filter((line: string) => line.indexOf('<') === 0).join('\n');
}

const spawn = require('child_process').spawn;

let serverProcess: any = null;

function checkAndPrintResult(prefix: string, result: any) {
	if (typeof result === 'object' && result && result.error) throw new Error(`${prefix}: ${JSON.stringify(result)}`);
	console.info(prefix, result);
}

async function main() {
	const serverRoot = `${__dirname}/../../..`;
	const tempDir = `${serverRoot}/temp`;
	process.chdir(serverRoot);
	await fs.remove(tempDir);
	await fs.mkdirp(tempDir);
	const pidFilePath = `${serverRoot}/test.pid`;

	fs.removeSync(`${serverRoot}/db-testing.sqlite`);

	// const migrateCommand = 'NODE_ENV=testing node dist/app.js --migrate-latest --env dev';
	const clearCommand = 'node dist/app.js --env dev --drop-tables';
	const migrateCommand = 'node dist/app.js --env dev --migrate-latest';

	await execCommand(clearCommand);
	await execCommand(migrateCommand);

	const serverCommandParams = [
		'dist/app.js',
		'--pidfile', pidFilePath,
		'--env', 'dev',
	];

	serverProcess = spawn('node', serverCommandParams, {
		detached: true,
		stdio: 'inherit',
		// env: { ...process.env,  NODE_ENV: 'testing'  },
	});

	const cleanUp = () => {
		console.info(`To run this server again: ${clearCommand} ${migrateCommand} && node ${serverCommandParams.join(' ')}`);
		serverProcess.kill();
	};

	process.on('SIGINT', () => {
		console.info('Received SIGINT signal - killing server');
		cleanUp();
		process.exit();
	});

	try {
		let response: any = null;

		console.info('Waiting for server to be ready...');

		while (true) {
			try {
				response = await curl('GET', 'api/ping');
				console.info(`Got ping response: ${JSON.stringify(response)}`);
				break;
			} catch (error) {
				// console.error('error', error);
				await sleep(0.5);
			}
		}

		console.info('Server is ready');

		// POST api/sessions

		const session = await curl('POST', 'api/sessions', null, { email: 'admin@localhost', password: 'admin' });
		checkAndPrintResult('Session: ', session);

		// PUT api/files/:fileId/content

		response = await curl('PUT', 'api/files/root:/photo.jpg:/content', null, null, { 'X-API-AUTH': session.id }, null, {
			uploadFile: `${serverRoot}/assets/tests/photo.jpg`,
		});
		checkAndPrintResult('Response:', response);

		// GET api/files/:fileId

		const file = await curl('GET', `api/files/${response.id}`, null, null, { 'X-API-AUTH': session.id });
		checkAndPrintResult('Response:', file);

		// GET api/files/:fileId/content

		response = await curl('GET', `api/files/${response.id}/content`, null, null, { 'X-API-AUTH': session.id }, null, {
			verbose: true,
			output: `${tempDir}/photo-downloaded.jpg`,
		});
		console.info(extractCurlResponse(response));

		// GET api/files/root/children

		const files = await curl('GET', 'api/files/root/children', null, null, { 'X-API-AUTH': session.id });
		checkAndPrintResult('Response:', files);

		// PATCH api/files/:fileId - change name

		response = await curl('PATCH', 'api/files/root:/photo.jpg:', null, { name: 'newname.jpg' }, { 'X-API-AUTH': session.id });
		checkAndPrintResult('Response:', response);
	} finally {
		cleanUp();
	}
}

main().catch(error => {
	console.error('FATAL ERROR', error);
	if (serverProcess) serverProcess.kill();
});
