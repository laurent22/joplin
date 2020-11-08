const fetch = require('node-fetch');
const fs = require('fs-extra');
const execa = require('execa');
const { execSync } = require('child_process');

const toolUtils = {};

toolUtils.execCommand = function(command) {
	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve([stdout.trim(), stderr.trim()].join('\n'));
			}
		});
	});
};

function quotePath(path) {
	if (!path) return '';
	if (path.indexOf('"') < 0 && path.indexOf(' ') < 0) return path;
	path = path.replace(/"/, '\\"');
	return `"${path}"`;
}

function commandToString(commandName, args = []) {
	const output = [quotePath(commandName)];

	for (const arg of args) {
		output.push(quotePath(arg));
	}

	return output.join(' ');
}

toolUtils.execCommandVerbose = function(commandName, args = []) {
	console.info(`> ${commandToString(commandName, args)}`);
	const promise = execa(commandName, args);
	promise.stdout.pipe(process.stdout);
	return promise;
};

toolUtils.execCommandWithPipes = function(executable, args) {
	const spawn = require('child_process').spawn;

	return new Promise((resolve, reject) => {
		const child = spawn(executable, args, { stdio: 'inherit' });

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code) => {
			if (code !== 0) {
				reject(`Ended with code ${code}`);
			} else {
				resolve();
			}
		});
	});
};

toolUtils.toSystemSlashes = function(path) {
	const os = process.platform;
	if (os === 'win32') return path.replace(/\//g, '\\');
	return path.replace(/\\/g, '/');
};

toolUtils.deleteLink = async function(path) {
	if (toolUtils.isWindows()) {
		try {
			execSync(`rmdir "${toolUtils.toSystemSlashes(path)}"`, { stdio: 'pipe' });
		} catch (error) {
			// console.info('Error: ' + error.message);
		}
	} else {
		try {
			fs.unlinkSync(toolUtils.toSystemSlashes(path));
		} catch (error) {
			// ignore
		}
	}
};

toolUtils.credentialDir = async function() {
	const username = require('os').userInfo().username;

	const toTry = [
		`c:/Users/${username}/joplin-credentials`,
		`/mnt/c/Users/${username}/joplin-credentials`,
		`/home/${username}/joplin-credentials`,
		`/Users/${username}/joplin-credentials`,
	];

	for (const dirPath of toTry) {
		if (await fs.exists(dirPath)) return dirPath;
	}

	throw new Error(`Could not find credential directory in any of these paths: ${JSON.stringify(toTry)}`);
};

// Returns the project root dir
toolUtils.rootDir = require('path').dirname(require('path').dirname(__dirname));

toolUtils.credentialFile = async function(filename) {
	const rootDir = await toolUtils.credentialDir();
	const output = `${rootDir}/${filename}`;
	if (!(await fs.exists(output))) throw new Error(`No such file: ${output}`);
	return output;
};

toolUtils.readCredentialFile = async function(filename) {
	const filePath = await toolUtils.credentialFile(filename);
	const r = await fs.readFile(filePath);
	return r.toString();
};

toolUtils.downloadFile = function(url, targetPath) {
	const https = require('https');
	const fs = require('fs');

	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(targetPath);
		https.get(url, function(response) {
			if (response.statusCode !== 200) reject(new Error(`HTTP error ${response.statusCode}`));
			response.pipe(file);
			file.on('finish', function() {
				// file.close();
				resolve();
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
};

toolUtils.fileSha256 = function(filePath) {
	return new Promise((resolve, reject) => {
		const crypto = require('crypto');
		const fs = require('fs');
		const algo = 'sha256';
		const shasum = crypto.createHash(algo);

		const s = fs.ReadStream(filePath);
		s.on('data', function(d) { shasum.update(d); });
		s.on('end', function() {
			const d = shasum.digest('hex');
			resolve(d);
		});
		s.on('error', function(error) {
			reject(error);
		});
	});
};

toolUtils.unlinkForce = async function(filePath) {
	const fs = require('fs-extra');

	try {
		await fs.unlink(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') return;
		throw error;
	}
};

toolUtils.fileExists = async function(filePath) {
	const fs = require('fs-extra');

	return new Promise((resolve, reject) => {
		fs.stat(filePath, function(err) {
			if (err == null) {
				resolve(true);
			} else if (err.code == 'ENOENT') {
				resolve(false);
			} else {
				reject(err);
			}
		});
	});
};

async function loadGitHubUsernameCache() {
	const path = `${__dirname}/github_username_cache.json`;

	if (await fs.exists(path)) {
		const jsonString = await fs.readFile(path);
		return JSON.parse(jsonString);
	}

	return {};
}

async function saveGitHubUsernameCache(cache) {
	const path = `${__dirname}/github_username_cache.json`;
	await fs.writeFile(path, JSON.stringify(cache));
}

toolUtils.githubUsername = async function(email, name) {
	const cache = await loadGitHubUsernameCache();
	const cacheKey = `${email}:${name}`;
	if (cacheKey in cache) return cache[cacheKey];

	let output = null;

	const oauthToken = await toolUtils.githubOauthToken();

	const urlsToTry = [
		`https://api.github.com/search/users?q=${encodeURI(email)}+in:email`,
		`https://api.github.com/search/users?q=user:${encodeURI(name)}`,
	];

	for (const url of urlsToTry) {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `token ${oauthToken}`,
			},
		});

		const responseText = await response.text();

		if (!response.ok) continue;

		const responseJson = JSON.parse(responseText);
		if (!responseJson || !responseJson.items || responseJson.items.length !== 1) continue;

		output = responseJson.items[0].login;
		break;
	}

	cache[cacheKey] = output;
	await saveGitHubUsernameCache(cache);

	return output;
};

toolUtils.patreonOauthToken = async function() {
	return toolUtils.readCredentialFile('patreon_oauth_token.txt');
};

toolUtils.githubOauthToken = async function() {
	return toolUtils.readCredentialFile('github_oauth_token.txt');
};

toolUtils.githubRelease = async function(project, tagName, options = null) {
	options = Object.assign({}, {
		isDraft: false,
		isPreRelease: false,
	}, options);

	const oauthToken = await toolUtils.githubOauthToken();

	const response = await fetch(`https://api.github.com/repos/laurent22/${project}/releases`, {
		method: 'POST',
		body: JSON.stringify({
			tag_name: tagName,
			name: tagName,
			draft: options.isDraft,
			prerelease: options.isPreRelease,
		}),
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `token ${oauthToken}`,
		},
	});

	const responseText = await response.text();

	if (!response.ok) throw new Error(`Cannot create GitHub release: ${responseText}`);

	const responseJson = JSON.parse(responseText);
	if (!responseJson.url) throw new Error(`No URL for release: ${responseText}`);

	return responseJson;
};

toolUtils.readline = question => {
	return new Promise((resolve) => {
		const readline = require('readline');

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.question(`${question} `, answer => {
			resolve(answer);
			rl.close();
		});
	});
};

toolUtils.isLinux = () => {
	return process && process.platform === 'linux';
};

toolUtils.isWindows = () => {
	return process && process.platform === 'win32';
};

toolUtils.isMac = () => {
	return process && process.platform === 'darwin';
};

toolUtils.insertContentIntoFile = async function(filePath, markerOpen, markerClose, contentToInsert) {
	const fs = require('fs-extra');
	let content = await fs.readFile(filePath, 'utf-8');
	// [^]* matches any character including new lines
	const regex = new RegExp(`${markerOpen}[^]*?${markerClose}`);
	content = content.replace(regex, markerOpen + contentToInsert + markerClose);
	await fs.writeFile(filePath, content);
};

toolUtils.dirname = (path) => {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
};

toolUtils.basename = (path) => {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
};

toolUtils.filename = (path, includeDir = false) => {
	if (!path) throw new Error('Path is empty');
	const output = includeDir ? path : toolUtils.basename(path);
	if (output.indexOf('.') < 0) return output;

	const splitted = output.split('.');
	splitted.pop();
	return splitted.join('.');
};

toolUtils.fileExtension = (path) => {
	if (!path) throw new Error('Path is empty');

	const output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
};

module.exports = toolUtils;
