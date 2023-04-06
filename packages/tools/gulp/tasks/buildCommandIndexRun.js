// Allow running that task "buildCommandIndex" without gulp

const task = require('./buildCommandIndex.js');

const main = async () => {
	await task.fn();
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
