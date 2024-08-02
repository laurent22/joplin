const { execSync } = require('child_process');

const build = (env = process.env.NODE_ENV) => {
	if (env === 'dev') return;

	const profile = env === 'production' ? '--release' : '--debug';
	return execSync(`wasm-pack build --scope joplin --target nodejs ${profile}`);
};

build();
