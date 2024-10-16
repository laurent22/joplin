const { execCommand } = require('@joplin/utils');
const yargs = require('yargs');

async function main() {
	const argv = yargs.argv;
	if (!argv.profile) throw new Error('OneNote build: profile value is missing');
	if (!['release', 'dev'].includes(argv.profile)) throw new Error('OneNote build: profile value is invalid');

	const buildCommand = `wasm-pack build --target nodejs --${argv.profile}`;

	await execCommand(buildCommand);
}

// eslint-disable-next-line promise/prefer-await-to-then
main().catch((error) => {
	console.error('Fatal error');
	if (error.stderr.includes('No such file or directory (os error 2)')) {
		console.error('----------------------------------------------------------------');
		console.error('Rust toolchain is missing, please install it: https://rustup.rs/');
		console.error('----------------------------------------------------------------');
	}
	process.exit(1);
});
