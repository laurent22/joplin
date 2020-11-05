const {main} = require('./syncTargetUtils');

const syncTargetType = process.argv.length <= 2 ? 'normal' : process.argv[2];

main(syncTargetType).catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});