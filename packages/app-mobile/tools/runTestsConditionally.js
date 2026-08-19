const { execSync } = require('child_process');

if (process.env.RUNNER_OS === 'macOS') {
	console.info('Skipping app-mobile tests on macOS');
	process.exit(0);
}

try {
	execSync('yarn test', { stdio: 'inherit' });
} catch (error) {
	console.error(error);
	process.exit(1);
}
