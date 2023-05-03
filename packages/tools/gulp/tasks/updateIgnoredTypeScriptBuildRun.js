// Allow running that task "updateIgnoredTypeScriptBuild" without gulp

const task = require('./updateIgnoredTypeScriptBuild.js');

const main = async () => {
	await task.fn();
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
