// const fs = require('fs-extra');
const utils = require('../../Tools/gulp/utils');

async function compileSpellfix() {
	await utils.execCommand(`wget -O ${__dirname}/sqlite.tar.gz "https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release"`);
	await utils.execCommand(`tar xzvf ${__dirname}/sqlite.tar.gz -C ${__dirname}`);
	await utils.execCommand(`wget -O ${__dirname}/amalgamation.zip "https://www.sqlite.org/2020/sqlite-amalgamation-3330000.zip"`);
	await utils.execCommand(`unzip ${__dirname}/amalgamation.zip -d ${__dirname}`);
	if (utils.isLinux()) {
		await utils.execCommand(`gcc -shared -fPIC -Wall -I${__dirname}/sqlite-amalgamation-3330000/ ${__dirname}/sqlite/ext/misc/spellfix.c -o ${__dirname}/spellfix.o`);
		utils.copyFile(`${__dirname}/spellfix.o`, `${__dirname}/../build/spellfix.so`);
		await utils.execCommand(`rm ${__dirname}/spellfix.o`);
	}
	await utils.execCommand(`rm -rf ${__dirname}/sqlite*`);
	await utils.execCommand(`rm ${__dirname}/amalgamation.zip`);
	return Promise.resolve();
}



async function main() {
	//
	// 1. Get the C source files
	// 2. Compile depending upon platform
	// 3. Move file to proper locations.
	//

	// await compileSpellfix();

}

module.exports = main;
