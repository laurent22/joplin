import { iconPackager } from '@ephox/oxide-icons-tools';
import clean from 'gulp-clean';
import { task, src, dest, series } from 'gulp';
import { readFileSync, copyFileSync } from 'fs';

task('icon-packager', function() {
	const contents = readFileSync('package.json');
	const name = JSON.parse(contents).iconPackName;

	return src('src/svg/**/*.svg')
		.pipe(iconPackager({ name }))
		.pipe(dest('dist'));
});

task('deploy', function() {
	copyFileSync(`${__dirname}/dist/icons/Joplin/icons.js`, `${__dirname}/../../../packages/app-desktop/gui/NoteEditor/NoteBody/TinyMCE/icons.js`);
	return Promise.resolve();
});

task('clean', function() {
	return src('./dist', {
		read: false,
		allowEmpty: true,
	}).pipe(clean());
});

task('default', series('clean', 'icon-packager', 'deploy'));
