const gulp = require('gulp');
const execa = require('execa');
const { stdout } = require('process');

const execCommand = async (executableName, args, options = null) => {
	options = {
		showInput: true,
		showStdout: true,
		showStderr: true,
		quiet: false,
		...options,
	};

	if (options.quiet) {
		options.showInput = false;
		options.showStdout = false;
		options.showStderr = false;
	}

	if (options.showInput) {
		stdout.write(`> ${executableName} ${args.join(' ')}\n`);
	}

	const promise = execa(executableName, args);
	if (options.showStdout && promise.stdout) promise.stdout.pipe(process.stdout);
	if (options.showStderr && promise.stderr) promise.stderr.pipe(process.stderr);
	const result = await promise;
	return result.stdout.trim();
};


const tasks = {
	completePublishAll: {
		fn: async () => {
			await execCommand('git', ['add', '-A']);
			await execCommand('git', ['commit', '-m', 'Releasing sub-packages']);

			// Lerna does some unnecessary auth check that doesn't work with
			// automation tokens, thus the --no-verify-access. Automation token
			// is still used for access when publishing even with this flag
			// (publishing would fail otherwise).
			// https://github.com/lerna/lerna/issues/2788
			await execCommand('lerna', ['publish', 'from-package', '-y', '--no-verify-access']);

			await execCommand('yarn', ['install']);
			await execCommand('git', ['add', '-A']);
			await execCommand('git', ['commit', '-m', 'Lock file']);

			await execCommand('git', ['push']);
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
				await execCommand('yarn', ['run', 'buildSequential']);
			} else {
				await execCommand('yarn', ['run', 'buildParallel']);
			}
		},
	},
};

for (const taskName in tasks) {
	gulp.task(taskName, tasks[taskName].fn);
}
