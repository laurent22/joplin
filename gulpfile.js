const gulp = require('gulp');
const ts = require('gulp-typescript');
const utils = require('./Tools/gulp/utils');

const tasks = {
	copyLib: require('./Tools/gulp/tasks/copyLib'),
};

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

const updateIgnoredTypeScriptBuildTask = async function() {
	const tsFiles = utils.getAllFiles(__dirname, { extensions: ['tsx', 'ts'] });

	const ignoredFiles = tsFiles.map(f => {
		const s = f.split('.');
		s.pop();
		return `${s.join('.')}.js`;
	});

	const regex = /(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)[\s\S]*(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)/;
	const replacement = `$1\n${ignoredFiles.join('\n')}\n$2`;

	await utils.replaceFileText(`${__dirname}/.gitignore`, regex, replacement);
	await utils.replaceFileText(`${__dirname}/.eslintignore`, regex, replacement);
};

gulp.task('tsc', tscTask);
gulp.task('copyLib', tasks.copyLib.fn);

gulp.task('watch', function() {
	gulp.watch(tasks.copyLib.src, tasks.copyLib.fn);
	gulp.watch(tscTaskSrc, gulp.series('tsc', 'updateIgnoredTypeScriptBuild'));
});

gulp.task('build', gulp.series('copyLib', 'tsc'));
gulp.task('updateIgnoredTypeScriptBuild', updateIgnoredTypeScriptBuildTask);
