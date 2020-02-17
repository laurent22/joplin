const gulp = require('gulp');
const ts = require('gulp-typescript');
const fs = require('fs-extra');

const toolUtils = {};

toolUtils.isLinux = () => {
	return process && process.platform === 'linux';
};

toolUtils.isWindows = () => {
	return process && process.platform === 'win32';
};

toolUtils.isMac = () => {
	return process && process.platform === 'darwin';
};

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

const pathUtils = {};

pathUtils.dirname = function(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
};

pathUtils.basename = function(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split(/\/|\\/);
	return s[s.length - 1];
};

pathUtils.filename = function(path, includeDir = false) {
	if (!path) throw new Error('Path is empty');
	let output = includeDir ? path : pathUtils.basename(path);
	if (output.indexOf('.') < 0) return output;

	output = output.split('.');
	output.pop();
	return output.join('.');
};

pathUtils.fileExtension = function(path) {
	if (!path) throw new Error('Path is empty');

	let output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
};

toolUtils.getAllFiles = function(dir, options = null) {
	var results = [];
	var list = fs.readdirSync(dir);
	list.forEach(function(file) {
		file = `${dir}/${file}`;
		const filename = pathUtils.basename(file);
		const ext = pathUtils.fileExtension(file).toLowerCase();

		var stat = fs.statSync(file);
		if (stat && stat.isDirectory()) {
			if (file.indexOf('ElectronClient/app/lib') >= 0) return;
			if (file.indexOf('CliClient/lib') >= 0) return;
			if (filename === 'node_modules' || filename === '.git' || filename === 'build' || filename === 'tests-build' || filename === 'dist') return;
			results = results.concat(toolUtils.getAllFiles(file, options));
		} else {
			let addIt = true;

			if (options.extensions && options.extensions.length && !options.extensions.includes(ext)) {
				addIt = false;
			}

			if (addIt) results.push(file.substr(__dirname.length + 1));
		}
	});
	return results;
};

async function replaceFileText(filePath, regex, toInsert) {
	const content = await fs.readFile(filePath, 'utf8');
	const newContent = content.replace(regex, toInsert);
	await fs.writeFile(filePath, newContent);
}

const tsProject = ts.createProject('tsconfig.json');

const tscTaskSrc = [
	'ReactNativeClient/**/*.tsx',
	'ReactNativeClient/**/*.ts',
	'ElectronClient/**/*.tsx',
	'ElectronClient/**/*.ts',
	'CliClient/**/*.tsx',
	'CliClient/**/*.ts',
];

const tscTask = function() {
	return tsProject.src()
		.pipe(tsProject())
		.js.pipe(gulp.dest('./'));
};

const copyLibSrc = 'ReactNativeClient/lib/**/*';

const copyLibTask = async function() {
	if (toolUtils.isWindows()) {
		await toolUtils.execCommand(`xcopy /C /I /H /R /Y /S "${__dirname}\\ReactNativeClient\\lib" ElectronClient\\app\\lib`);
	} else {
		await toolUtils.execCommand(`rsync -a --delete "${__dirname}/ReactNativeClient/lib/" "ElectronClient/app/lib/"`);
		await toolUtils.execCommand(`rsync -a --delete "${__dirname}/ReactNativeClient/lib/" "CliClient/build/lib/"`);
	}
};

const updateIgnoredTypeScriptBuildTask = async function() {
	const tsFiles = toolUtils.getAllFiles(__dirname, { extensions: ['tsx', 'ts'] });

	const ignoredFiles = tsFiles.map(f => {
		const s = f.split('.');
		s.pop();
		return `${s.join('.')}.js`;
	});

	const regex = /(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)[\s\S]*(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)/;
	const replacement = `$1\n${ignoredFiles.join('\n')}\n$2`;

	await replaceFileText(`${__dirname}/.gitignore`, regex, replacement);
	await replaceFileText(`${__dirname}/.eslintignore`, regex, replacement);
};

gulp.task('tsc', tscTask);
gulp.task('copyLib', copyLibTask);

gulp.task('watch', function() {
	gulp.watch(tscTaskSrc, tscTask);
	gulp.watch(copyLibSrc, copyLibTask);
});

gulp.task('build', gulp.series(tscTask, copyLibTask));

gulp.task('updateIgnoredTypeScriptBuild', updateIgnoredTypeScriptBuildTask);
