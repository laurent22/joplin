class FsDriverDummy {
	constructor() {}
	appendFileSync(path, string) {}
	writeBinaryFile(path, content) {}
	readFile(path) {}
}

module.exports = { FsDriverDummy };
