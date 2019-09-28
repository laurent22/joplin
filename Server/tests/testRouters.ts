require('source-map-support').install();

import * as fs from 'fs-extra';

const { stringify } = require('query-string');

const execCommand = function(command:string, returnStdErr:boolean = false):Promise<string> {
	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		exec(command, (error:any, stdout:any, stderr:any) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
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

async function sleep(seconds:number) {
	return new Promise((resolve:Function) => {
		setTimeout(() => {
			resolve();
		}, seconds * 1000);
	});
}

async function curl(method:string, path:string, query:object = null, body:any = null, headers:any = null, formFields:string[] = null, options:any = {}):Promise<any> {
	const curlCmd:string[] = ['curl'];

	if (options.verbose) curlCmd.push('-v');
	if (options.output) curlCmd.push(`--output "${options.output}"`);

	if ((['PUT', 'DELETE'].indexOf(method) >= 0) || (method == 'POST' && !formFields && !body)) {
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
	}

	if (!headers && body) headers = {};

	if (body) headers['Content-Type'] = 'application/json';

	if (headers) {
		for (const k in headers) {
			curlCmd.push('--header');
			curlCmd.push(`"${k}: ${headers[k]}"`);
		}
	}

	curlCmd.push(`http://localhost:3222/${path}${query ? `?${stringify(query)}` : ''}`);

	console.info(`Running: ${curlCmd.join(' ')}`);

	const result = await execCommand(curlCmd.join(' '), !!options.verbose);
	if (options.verbose) return result;
	return result ? JSON.parse(result) : null;
}

const spawn = require('child_process').spawn;

let serverProcess:any = null;

async function main() {
	const serverRoot = `${__dirname}/../..`;
	const tempDir = `${serverRoot}/tests/temp`;
	process.chdir(serverRoot);
	await fs.remove(tempDir);
	await fs.mkdirp(tempDir);
	const pidFilePath = `${serverRoot}/test.pid`;

	fs.removeSync(`${serverRoot}/db-testing.sqlite`);

	const compileCommmand = 'npm run compile';
	const migrateCommand = 'NODE_ENV=testing npm run db-migrate';

	await execCommand(compileCommmand);
	await execCommand(migrateCommand);

	const serverCommandParams = ['dist/app/app.js', '--pidfile', pidFilePath];

	serverProcess = spawn('node', serverCommandParams, {
		detached: true,
		stdio: 'inherit',
		env: Object.assign({}, process.env, { NODE_ENV: 'testing' }),
	});

	let response:any = null;

	console.info('Waiting for server to be ready...');

	while (true) {
		try {
			response = await curl('GET', 'api/ping');
			console.info(`Got ping response: ${JSON.stringify(response)}`);
			break;
		} catch (error) {
			await sleep(0.5);
		}
	}

	console.info('Server is ready');

	// POST api/sessions

	const session = await curl('POST', 'api/sessions', null, { email: 'admin@localhost', password: 'admin' });
	console.info('Session: ', session);

	// PUT api/files/:fileId/content

	response = await curl('PUT', 'api/files/root:/photo.jpg:/content', null, null, { 'X-API-AUTH': session.id }, null, {
		uploadFile: `${serverRoot}/tests/support/photo.jpg`,
	});
	console.info('Response:', response);

	// GET api/files/:fileId

	let file = await curl('GET', `api/files/${response.id}`, null, null, { 'X-API-AUTH': session.id });
	console.info('Response:', file);

	// GET api/files/:fileId/content

	response = await curl('GET', `api/files/${response.id}/content`, null, null, { 'X-API-AUTH': session.id }, null, {
		verbose: true,
		output: `${serverRoot}/tests/temp/photo-downloaded.jpg`,
	});
	console.info(response);

	console.info(`To run this server again: ${compileCommmand} && ${migrateCommand} && node ${serverCommandParams.join(' ')}`);

	serverProcess.kill();
}

main().catch(error => {
	console.error('FATAL ERROR', error);
	if (serverProcess) serverProcess.kill();
});
