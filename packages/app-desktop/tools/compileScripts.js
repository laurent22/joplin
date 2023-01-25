const fs = require('fs-extra');

const basePath = `${__dirname}/../../..`;

module.exports = function() {
	const libContent = [
		fs.readFileSync(`${basePath}/packages/lib/string-utils-common.js`, 'utf8'),
		fs.readFileSync(`${basePath}/packages/lib/markJsUtils.js`, 'utf8'),
		fs.readFileSync(`${basePath}/packages/lib/renderers/webviewLib.js`, 'utf8'),
	];

	fs.writeFileSync(`${__dirname}/../gui/note-viewer/lib.js`, libContent.join('\n'), 'utf8');

	return Promise.resolve();
};
