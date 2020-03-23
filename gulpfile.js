const gulp = require('gulp');
const glob = require('glob');
const execa = require('execa');
const utils = require('./Tools/gulp/utils');

const tasks = {
	copyLib: require('./Tools/gulp/tasks/copyLib'),
	tsc: require('./Tools/gulp/tasks/tsc'),
};

const updateIgnoredTypeScriptBuildTask = async function() {
	const tsFiles = glob.sync(`${__dirname}{/**/*.ts,/**/*.tsx}`, {
		ignore: [
			'**/node_modules/**',
			'**/.git/**',
			'**/ElectronClient/lib/**',
			'**/CliClient/build/lib/**',
			'**/CliClient/tests-build/lib/**',
			'**/ElectronClient/dist/**',
			'**/Modules/TinyMCE/JoplinLists/**',
		],
	}).map(f => f.substr(__dirname.length + 1));

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

gulp.task('tsc', tasks.tsc.fn);
gulp.task('copyLib', tasks.copyLib.fn);
gulp.task('updateIgnoredTypeScriptBuild', updateIgnoredTypeScriptBuildTask);

gulp.task('watch', function() {
	gulp.watch(tasks.copyLib.src, tasks.copyLib.fn);
	gulp.watch(tasks.tsc.src, updateIgnoredTypeScriptBuildTask);

	// For watching, we use the actual tsc tool because it's more robust and
	// doesn't crash when there's an error
	const promise = execa('node', ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json'], { cwd: `${__dirname}` });
	promise.stdout.pipe(process.stdout);
});

gulp.task('build', gulp.series('copyLib', 'tsc', 'updateIgnoredTypeScriptBuild'));
