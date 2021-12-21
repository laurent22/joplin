const path = require('path');
const distDir = path.resolve(__dirname, 'dist');

module.exports = {
	entry: './index.js',
	mode: 'production',
	target: 'node',
	output: {
		filename: 'index.js',
		path: distDir,
	},
};
