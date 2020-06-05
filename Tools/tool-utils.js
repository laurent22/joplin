const fetch = require('node-fetch');
const fs = require('fs-extra');

const toolUtils = {};

toolUtils.execCommand = function(command) {
	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve(stdout.trim());
			}
		});
	});
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
	const fs = require('fs-extra');
	const r = await fs.readFile(`${__dirname}/patreon_oauth_token.txt`);
	return r.toString();
};

toolUtils.githubOauthToken = async function() {
	const fs = require('fs-extra');
	const r = await fs.readFile(`${__dirname}/github_oauth_token.txt`);
	return r.toString();
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

module.exports = toolUtils;
