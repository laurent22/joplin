const fs = require('fs-extra');
const { time } = require('lib/time-utils.js');

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

	writeFile(path, string, encoding = 'base64') {
		return fs.writeFile(path, string, { encoding: encoding });
	}

	async move(source, dest) {
		let lastError = null;

		for (let i = 0; i < 5; i++) {
			try {
				const output = await fs.move(source, dest, { overwrite: true });
				return output;
			} catch (error) {
				lastError = error;
				// Normally cannot happen with the `overwrite` flag but sometime it still does.
				// In this case, retry.
				if (error.code == 'EEXIST') {
					await time.sleep(1);
					continue;
				}
				throw this.fsErrorToJsError_(error);
			}
		}

		throw lastError;
	}

	exists(path) {
		return fs.pathExists(path);
	}

	async mkdir(path) {
		return fs.mkdirp(path);
	}

	async stat(path) {
		const s = await fs.stat(path);
		s.path = path;
		return s;
	}

	async setTimestamp(path, timestampDate) {
		return fs.utimes(path, timestampDate, timestampDate);
	}

	async readDirStats(path) {
		let items = await fs.readdir(path);
		let output = [];
		for (let i = 0; i < items.length; i++) {
			let stat = await this.stat(path + '/' + items[i]);
			if (!stat) continue; // Has been deleted between the readdir() call and now
			stat.path = stat.path.substr(path.length + 1);
			output.push(stat);
		}
		return output;
	}

	open(path, mode) {
		return fs.open(path, mode);
	}

	close(handle) {
		return fs.close(handle);
	}

	readFile(path, encoding = 'utf8') {
		if (encoding === 'Buffer') return fs.readFile(path); // Returns the raw buffer
		return fs.readFile(path, encoding);
	}

	// Always overwrite destination
	async copy(source, dest) {
		return fs.copy(source, dest, { overwrite: true });
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
		const result = await fs.read(handle, buffer, 0, length, null);
		if (!result.bytesRead) return null;
		buffer = buffer.slice(0, result.bytesRead);
		if (encoding === 'base64') return buffer.toString('base64');
		if (encoding === 'ascii') return buffer.toString('ascii');
		throw new Error('Unsupported encoding: ' + encoding);
	}

}

module.exports.FsDriverNode = FsDriverNode;