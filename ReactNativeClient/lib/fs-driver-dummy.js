class FsDriverDummy {

	appendFileSync(path, string) {}
	writeBinaryFile(path, content) {}
	readFile(path) {}

}

export { FsDriverDummy }