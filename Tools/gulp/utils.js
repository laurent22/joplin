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
		exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
			if (error) {

				// Special case for robocopy, which will return non-zero error codes
				// when sucessful. Doc is very imprecise but <= 7 seems more or less
				// fine and >= 8 seems more errorish. https://ss64.com/nt/robocopy-exit.html
				if (command.indexOf('robocopy') === 0 && error.code <= 7) {
					resolve(stdout.trim());
					return;
				}

				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					const newError = new Error(`Code: ${error.code}: ${error.message}: ${stdout.trim()}`);
					reject(newError);
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
	options = Object.assign({}, {
		excluded: [],
		delete: true,
	}, options);

	src = utils.toSystemSlashes(src);
	dest = utils.toSystemSlashes(dest);

	await utils.mkdir(dest);

	if (utils.isWindows()) {
		let cmd = ['robocopy'];
		cmd.push(`"${src}"`);
		cmd.push(`"${dest}"`);
		cmd.push('/e');
		if (options.delete) cmd.push('/purge');

		if (options.excluded.length) {
			cmd.push('/xd');
			cmd = cmd.concat(options.excluded.map(p => `"${utils.toSystemSlashes(p)}"`).join(' '));
		}

		await utils.execCommand(cmd.join(' '));
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

utils.mkdir = async function(dir) {
	if (utils.isWindows()) {
		return utils.execCommand(`if not exist "${utils.toSystemSlashes(dir)}" mkdir "${utils.toSystemSlashes(dir)}"`);
	} else {
		return fs.mkdirp(dir);
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
