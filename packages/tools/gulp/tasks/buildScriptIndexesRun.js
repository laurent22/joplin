// Allow running that task "buildScriptIndexes" without gulp

const task = require('./buildScriptIndexes.js');

const main = async () => {
	await task.fn();
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
