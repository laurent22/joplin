require('app-module-path').addPath(__dirname);

const { removeDiacritics, escapeFilename, wrap, prepareCmdStringWindows, splitCommandString, padLeft, toTitleCase } = require('lib/string-utils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('StringUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('adds quotes if whole string is an existing file', async (done) => {
		let fnExists = async (fpath) => true;
		let ret = await prepareCmdStringWindows('abc def /g', fnExists);
		expect(ret).toBe('"abc def /g"');
		ret = await prepareCmdStringWindows('abc def', fnExists);
		expect(ret).toBe('"abc def"');
		ret = await prepareCmdStringWindows('abc "def"', fnExists);
		expect(ret).toBe('abc "def"');
		ret = await prepareCmdStringWindows('abc', fnExists);
		expect(ret).toBe('abc');
		done();
	});
	
	it('doesn\'t add quotes if whole string is not an existing file', async (done) => {
		let fnExists = async (fpath) => false;
		let ret = await prepareCmdStringWindows('abc def /g', fnExists);
		expect(ret).toBe('abc def /g');
		ret = await prepareCmdStringWindows('abc def', fnExists);
		expect(ret).toBe('abc def');
		ret = await prepareCmdStringWindows('abc "def"', fnExists);
		expect(ret).toBe('abc "def"');
		ret = await prepareCmdStringWindows('abc', fnExists);
		expect(ret).toBe('abc');
		done();
	});
	
	it('doubles backslashes', async (done) => {
		let fnExists = async (fpath) => false;
		let ret = await prepareCmdStringWindows('C:\\Program Files\\Foo\\F', fnExists);
		expect(ret).toBe('C:\\\\Program Files\\\\Foo\\\\F');
		ret = await prepareCmdStringWindows('a/b/ c /d', fnExists);
		expect(ret).toBe('a/b/ c /d');
		ret = await prepareCmdStringWindows('a\\b c /d', fnExists);
		expect(ret).toBe('a\\\\b c /d');
		done();
	});
});