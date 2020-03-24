const fs = require('fs-extra');

const utils = {};

utils.isLinux = () => {
	return process && process.platform === 'linux';
};

utils.isWindows = () => {
	return process && process.platform === 'win32';
};

utils.isMac = () => {
	return process && process.platform === 'darwin';
};

utils.execCommand = function(command) {
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

utils.dirname = function(path) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
};

utils.basename = function(path) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
};

utils.filename = function(path, includeDir = false) {
	if (!path) throw new Error('Path is empty');
	let output = includeDir ? path : utils.basename(path);
	if (output.indexOf('.') < 0) return output;

	output = output.split('.');
	output.pop();
	return output.join('.');
};

utils.toSystemSlashes = function(path) {
	if (utils.isWindows()) return path.replace(/\//g, '\\');
	return path.replace(/\\/g, '/');
};

utils.fileExtension = function(path) {
	if (!path) throw new Error('Path is empty');

	const output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
};

utils.replaceFileText = async function(filePath, regex, toInsert) {
	const content = await fs.readFile(filePath, 'utf8');
	const newContent = content.replace(regex, toInsert);
	if (newContent === content) return Promise.resolve();
	await fs.writeFile(filePath, newContent);
};

utils.copyDir = async function(src, dest, options) {
	const os = require('os');

	options = Object.assign({}, {
		excluded: [],
		delete: true,
	}, options);

	src = utils.toSystemSlashes(src);
	dest = utils.toSystemSlashes(dest);

	await fs.mkdirp(dest);

	if (utils.isWindows()) {
		let excludedFlag = '';
		let tempFile = null;
		if (options.excluded.length) {
			tempFile = `${os.tmpdir()}\\xcopy_excluded_${Date.now()}.txt`;
			await fs.writeFile(tempFile, options.excluded.join('\n'));
			excludedFlag = `/EXCLUDE:${tempFile}`;
		}

		// TODO: add support for delete flag

		await utils.execCommand(`xcopy /C /I /H /R /Y /S ${excludedFlag} "${src}" "${dest}"`);

		if (tempFile) await fs.remove(tempFile);
	} else {
		let excludedFlag = '';
		if (options.excluded.length) {
			excludedFlag = options.excluded.map(f => {
				return `--exclude "${f}"`;
			}).join(' ');
		}

		let deleteFlag = '';
		if (options.delete) deleteFlag = '--delete';

		await utils.execCommand(`rsync -a ${deleteFlag} ${excludedFlag} "${src}/" "${dest}/"`);
	}
};

utils.copyFile = async function(src, dest) {
	await fs.copy(src, dest);
};

utils.rootDir = function() {
	return utils.dirname(utils.dirname(__dirname));
};

utils.registerGulpTasks = function(gulp, tasks) {
	for (const taskName in tasks) {
		gulp.task(taskName, tasks[taskName].fn);
	}
};

module.exports = utils;
