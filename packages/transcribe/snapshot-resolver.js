const path = require('path');

// This is required since we don't want to store snapshots inside the dist folder
module.exports = {
	resolveSnapshotPath: (testPath, snapshotExtension) => {
		const srcPath = testPath
			.replace(/dist\/src\//, 'src/')
			.replace(/\.js$/, '');

		const snapshotPath = path.join(
			path.dirname(srcPath),
			'__snapshots__',
			path.basename(srcPath) + snapshotExtension,
		);

		return snapshotPath;
	},

	resolveTestPath: (snapshotFilePath, snapshotExtension) => {
		const snapshotName = path.basename(snapshotFilePath).replace(snapshotExtension, '');

		const srcDir = (path.dirname(path.dirname(snapshotFilePath))).replace('__snapshots__', '');

		const testPath = path.join(
			srcDir.replace(/src/, 'dist/src'),
			`${snapshotName}.js`,
		);
		return testPath;
	},

	testPathForConsistencyCheck: '/dist/src/example.test.js',
};
