'use strict';

// Dependencies:
//
// sudo apt install gettext

const rootDir = `${__dirname}/../..`;
const fs = require('fs-extra');
const localesDir = `${rootDir}/packages/tools/locales`;
const { execCommand } = require('./tool-utils.js');

async function main() {
	const files = fs.readdirSync(localesDir);
	let hasErrors = false;
	for (const file of files) {
		if (!file.endsWith('.po')) continue;
		const fullPath = `${localesDir}/${file}`;

		try {
			await execCommand(`msgfmt -v "${fullPath}"`);
		} catch (error) {
			hasErrors = true;
			console.error(error);
		}
	}

	if (hasErrors) throw new Error('Some .po files could not be validated');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
