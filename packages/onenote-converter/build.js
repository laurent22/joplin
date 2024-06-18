const { execSync } = require('child_process');

const build = () => {
	const profile = process.env.NODE_ENV === 'production' ? '--release' : '--debug';
	return execSync(`wasm-pack build --target nodejs ${profile}`);
};

build();
