const toolUtils = {};

toolUtils.execCommand = function(command) {
	const exec = require('child_process').exec

	return new Promise((resolve, reject) => {
		let childProcess = exec(command, (error, stdout, stderr) => {
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
}

toolUtils.downloadFile = function(url, targetPath) {
	const https = require('https');
	const fs = require('fs');

	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(targetPath);
		const request = https.get(url, function(response) {
			if (response.statusCode !== 200) reject(new Error('HTTP error ' + response.statusCode));
			response.pipe(file);
			file.on('finish', function() {
				//file.close();
				resolve();
			});
		}).on('error', (error) => {
			reject(error);
		});
	});
}

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
}

toolUtils.unlinkForce = async function(filePath) {
	const fs = require('fs-extra');

	try {
		await fs.unlink(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') return;
		throw error;
	}
}

toolUtils.fileExists = async function(filePath) {
	return new Promise((resolve, reject) => {
		fs.stat(filePath, function(err, stat) {
			if (err == null) {
				resolve(true);
			} else if(err.code == 'ENOENT') {
				resolve(false);
			} else {
				reject(err);
			}
		});
	});
}

toolUtils.githubOauthToken = async function() {
	const r = await fs.readFile(__dirname + '/Tools/github_oauth_token.txt');
	return r.toString();
}

toolUtils.githubRelease = async function(tagName, isDraft) {
	const oauthToken = await githubOauthToken();
	
	const response = await fetch('https://api.github.com/repos/laurent22/joplin/releases', {
		method: 'POST', 
		body: JSON.stringify({
			tag_name: tagName,
			name: tagName,
			draft: isDraft,
		}),
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'token ' + oauthToken,
		},
	});

	const responseText = await response.text();
	
	if (!response.ok) throw new Error('Cannot create GitHub release: ' + responseText);

	const responseJson = JSON.parse(responseText);
	if (!responseJson.url) throw new Error('No URL for release: ' + responseText);

	return responseJson;
}

toolUtils.handleCommitHook = async function() {
	const fs = require('fs-extra');
	const filePath = __dirname + '/commit_hook.txt');
	if (!(await fs.pathExists(filePath)) return;
	const content = await fs.readFile(filePath);
	if (!content) throw new Error('No content in ' + filePath); 
	console.info('Running hook: ' + content);
	console.info(await toolUtils.execCommand(content));
}

module.exports = toolUtils;