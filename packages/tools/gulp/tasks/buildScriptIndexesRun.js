// Allow running that task "buildScriptIndexes" without gulp


import task from './buildScriptIndexes.js';
const main = async () => {
	await task.fn();
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
