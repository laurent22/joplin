const fs = require('fs-extra');

class FsDriverNode {

	appendFileSync(path, string) {
		return fs.appendFileSync(path, string);
	}

	appendFile(path, string, encoding = 'base64') {
		return fs.appendFile(path, string, { encoding: encoding });
	}

	writeBinaryFile(path, content) {
		let buffer = new Buffer(content);
		return fs.writeFile(path, buffer);
	}

	open(path, mode) {
		return fs.open(path, mode);
	}

	close(handle) {
		return fs.close(handle);
	}

	readFile(path) {
		return fs.readFile(path);
	}

	async unlink(path) {
		try {
			await fs.unlink(path);
		} catch (error) {
			if (error.code === 'ENOENT') return; // Don't throw if the file does not exist
			throw error;
		}
	}

	async readFileChunk(handle, length, encoding = 'base64') {
		let buffer = new Buffer(length);
		const bytesRead = await fs.read(handle, buffer, 0, length, null)
		if (!bytesRead) return null;
		const output = buffer.slice(0, bytesRead);
		if (encoding === 'base64') return output.toString('base64');
		if (encoding === 'ascii') return output.toString('ascii');
		throw new Error('Unsupported encoding: ' + encoding);
	}

}

module.exports.FsDriverNode = FsDriverNode;