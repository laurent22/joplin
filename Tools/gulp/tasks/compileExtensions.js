const fs = require('fs-extra');
const utils = require('../utils');



async function compileSpellfix(dest) {
	try {
		await utils.execCommand(`wget -nc -q -O ${dest}/sqlite.tar.gz "https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release"`);
	} catch (e) {
		console.info(e);
	}

	try {
		await utils.execCommand(`wget -nc -O ${dest}/amalgamation.tar.gz "https://www.sqlite.org/2020/sqlite-autoconf-3330000.tar.gz"`);
	} catch (e) {
		console.info(e);
	}

	await utils.execCommand(`tar xzvf ${dest}/sqlite.tar.gz -C ${dest}`);
	await utils.execCommand(`tar xzvf ${dest}/amalgamation.tar.gz -C ${dest}`);

	if (utils.isLinux()) {
		console.info('Compiling sql extensions - Linux ');
		await utils.execCommand(`gcc -shared -fPIC -Wall -I${dest}/sqlite-autoconf-3330000/ ${dest}/sqlite/ext/misc/spellfix.c -o ${dest}/spellfix.so`);
	}

	if (utils.isMac()) {
		console.info('Compiling sql extensions - Mac ');
		await utils.execCommand(`gcc -shared -fPIC -Wall -I${dest}/sqlite-autoconf-3330000/ -dynamiclib ${dest}/sqlite/ext/misc/spellfix.c -o ${dest}/spellfix.dylib`);
	}

	return Promise.resolve();
}



async function main() {
	const rootDir = utils.rootDir();
	const dest = `${rootDir}/ReactNativeClient/lib/sql-extensions`;

	fs.ensureDir(dest)
		.then(async () => {
			await compileSpellfix(dest);
		})
		.catch(err => {
			console.error(err);
		});
	//
	// 1. Get the C source files
	// 2. Compile depending upon platform
	// 3. Move file to proper locations.
	//

	return Promise.resolve();

}

module.exports = main;
