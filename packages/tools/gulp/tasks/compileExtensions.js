const fs = require('fs-extra');
const utils = require('../utils');


async function getSourceCode(dest) {
	await utils.execCommand(`curl -o ${dest}/sqlite.tar.gz "https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release"`);
	await utils.execCommand(`curl -o ${dest}/amalgamation.tar.gz "https://www.sqlite.org/2020/sqlite-autoconf-3330000.tar.gz"`);
	await utils.execCommand(`tar -xzvf ${dest}/sqlite.tar.gz -C ${dest}`);
	await utils.execCommand(`tar -xzvf ${dest}/amalgamation.tar.gz -C ${dest}`);
}

async function main() {
	const rootDir = utils.rootDir();
	const dest = `${rootDir}/packages/app-mobile/lib/sql-extensions`;

	try {
		await fs.ensureDir(dest);

		if (utils.isLinux()) {
			try {
				await fs.promises.access(`${dest}/spellfix.so`);
			} catch (e) {
				await getSourceCode(dest);
				await utils.execCommand(`gcc -shared -fPIC -Wall -I${dest}/sqlite-autoconf-3330000/ ${dest}/sqlite/ext/misc/spellfix.c -o ${dest}/spellfix.so`);
			}
		}

		if (utils.isMac()) {
			try {
				await fs.promises.access(`${dest}/spellfix.dylib`);
			} catch (e) {
				await getSourceCode(dest);
				await utils.execCommand(`gcc -shared -fPIC -Wall -I${dest}/sqlite-autoconf-3330000/ -dynamiclib ${dest}/sqlite/ext/misc/spellfix.c -o ${dest}/spellfix.dylib`);
			}
		}

		// if (utils.isWindows()) {
		// 	try {
		// 		await fs.promises.access(`${dest}/spellfix.dll`);
		// 	} catch (e) {
		// 		await getSourceCode(dest);
		// 		await utils.execCommand(`cl /I ${dest}/sqlite-autoconf-3330000 ${dest}/sqlite/ext/misc/spellfix.c -link -dll -out:spellfix.dll `)
		// 	}
		// }
	} catch (e) {
		console.warn(e);
	}

	await fs.remove(`${dest}/sqlite.tar.gz`);
	await fs.remove(`${dest}/amalgamation.tar.gz`);
	await fs.remove(`${dest}/sqlite`);
	await fs.remove(`${dest}/sqlite-autoconf-3330000`);
}

module.exports = main;
