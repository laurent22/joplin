const iconPackager = require('@ephox/oxide-icons-tools').iconPackager;
const clean = require('gulp-clean');
const gulp = require('gulp');
const fs = require('fs');

gulp.task('icon-packager', function() {
	const contents = fs.readFileSync('package.json');
	const name = JSON.parse(contents).iconPackName;

	return gulp.src('src/svg/**/*.svg')
		.pipe(iconPackager({ name }))
		.pipe(gulp.dest('dist'));
});

gulp.task('deploy', function() {
	fs.copyFileSync(`${__dirname}/dist/icons/Joplin/icons.js`, `${__dirname}/../../../ElectronClient/gui/NoteEditor/NoteBody/TinyMCE/icons.js`);
	return Promise.resolve();
});

gulp.task('clean', function() {
	return gulp.src('./dist', {
		read: false,
		allowEmpty: true,
	}).pipe(clean());
});

gulp.task('default', gulp.series('clean', 'icon-packager', 'deploy'));
