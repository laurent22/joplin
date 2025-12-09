const { execCommand } = require('@joplin/utils');
const yargs = require('yargs');

async function main() {
	if (!process.env.IS_CONTINUOUS_INTEGRATION) {
		// eslint-disable-next-line no-console
		console.info(
			'----------------------------------------------------------------\n' +
			'Not building onenote-converter because it is not a continuous integration environment.\n' +
			'Use IS_CONTINUOUS_INTEGRATION=1 env var if build is necessary.\n' +
			'----------------------------------------------------------------',
		);
		return;
	}

	// Sometimes the onenote-converter build needs to be disabled in CI.
	if (process.env.SKIP_ONENOTE_CONVERTER_BUILD) {
		// eslint-disable-next-line no-console
		console.info('SKIP_ONENOTE_CONVERTER_BUILD was set. The onenote-converter package will not be built.');
		return;
	}

	const argv = yargs.argv;
	if (!argv.profile) throw new Error('OneNote build: profile value is missing');
	if (!['release', 'dev'].includes(argv.profile)) throw new Error('OneNote build: profile value is invalid');

	const buildCommand = `wasm-pack build --target nodejs --${argv.profile} ./renderer`;

	await execCommand(buildCommand);

	if (argv.profile !== 'release') return;

	// If release build, remove intermediary folder to decrease size of release
	const removeIntermediaryFolder = 'cargo clean';

	await execCommand(removeIntermediaryFolder);
}

// eslint-disable-next-line promise/prefer-await-to-then
main().catch((error) => {
	console.error('Fatal error', error);
	if (error.stderr.includes('No such file or directory (os error 2)')) {
		console.error('----------------------------------------------------------------');
		console.error('Rust toolchain is missing, please install it: https://rustup.rs/');
		console.error('----------------------------------------------------------------');
	}
	process.exit(1);
});
