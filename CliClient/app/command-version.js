module.exports = {
	usage: 'version',
	description: 'Displays version information',
	action: function(args, end) {
		const packageJson = require('./package.json');
		this.log(packageJson.name + ' ' + packageJson.version);
		end();
	},
};