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

			await utils.execCommandVerbose('git', ['push']);
		},
	},
};

utils.registerGulpTasks(gulp, tasks);
