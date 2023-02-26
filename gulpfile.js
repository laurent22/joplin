const gulp = require('gulp');
const utils = require('./packages/tools/gulp/utils');

const tasks = {
	updateIgnoredTypeScriptBuild: require('./packages/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
	buildCommandIndex: require('./packages/tools/gulp/tasks/buildCommandIndex'),
	completePublishAll: {
		fn: async () => {
			await utils.execCommandVerbose('git', ['add', '-A']);
			await utils.execCommandVerbose('git', ['commit', '-m', 'Releasing sub-packages']);

			// Lerna does some unnecessary auth check that doesn't work with
			// automation tokens, thus the --no-verify-access. Automation token
			// is still used for access when publishing even with this flag
			// (publishing would fail otherwise).
			// https://github.com/lerna/lerna/issues/2788
			await utils.execCommandVerbose('lerna', ['publish', 'from-package', '-y', '--no-verify-access']);

			await utils.execCommandVerbose('yarn', ['install']);
			await utils.execCommandVerbose('git', ['add', '-A']);
			await utils.execCommandVerbose('git', ['commit', '-m', 'Lock file']);

			await utils.execCommandVerbose('git', ['push']);
		},
	},
	build: {
		fn: async () => {
			// Building everything in parallel seems to be unreliable on CI as
			// certain scripts randomly fail with missing files or folder, or
			// cannot delete certain directories (eg. copyPluginAssets or
			// copyApplicationAssets). Because of this, on CI, we run the build
			// sequencially. Locally we run it in parallel, which is much
			// faster, especially when having to rebuild after adding a
			// dependency.
			if (process.env.BUILD_SEQUENCIAL === '1') {
				await utils.execCommandVerbose('yarn', ['run', 'buildSequential']);
			} else {
				await utils.execCommandVerbose('yarn', ['run', 'buildParallel']);
			}
		},
	},
};

utils.registerGulpTasks(gulp, tasks);
