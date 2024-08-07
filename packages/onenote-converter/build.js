const { execSync } = require('child_process');

// This should in the postinstall script.
// The idea is that users that don't need this package can skip the build step.
// But that it should be built in production.
const build = async () => {
	if (!process.env.IS_CONTINUOUS_INTEGRATION) return;

	return execSync('wasm-pack build --scope joplin --target nodejs --release');
};

build();
