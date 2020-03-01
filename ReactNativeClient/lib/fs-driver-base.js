const { filename, fileExtension } = require('lib/path-utils');
const { time } = require('lib/time-utils.js');

class FsDriverBase {
	async isDirectory(path) {
		const stat = await this.stat(path);
		return !stat ? false : stat.isDirectory();
	}

	async readDirStatsHandleRecursion_(basePath, stat, output, options) {
		if (options.recursive && stat.isDirectory()) {
			const subPath = `${basePath}/${stat.path}`;
			const subStats = await this.readDirStats(subPath, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				subStat.path = `${stat.path}/${subStat.path}`;
				output.push(subStat);
			}
		}

		return output;
	}

	async findUniqueFilename(name, reservedNames = null) {
		if (reservedNames === null) {
			reservedNames = [];
		}
		let counter = 1;

		let nameNoExt = filename(name, true);
		let extension = fileExtension(name);
		if (extension) extension = `.${extension}`;
		let nameToTry = nameNoExt + extension;
		while (true) {
			// Check if the filename does not exist in the filesystem and is not reserved
			const exists = await this.exists(nameToTry) || reservedNames.includes(nameToTry);
			if (!exists) return nameToTry;
			nameToTry = `${nameNoExt} (${counter})${extension}`;
			counter++;
			if (counter >= 1000) {
				nameToTry = `${nameNoExt} (${new Date().getTime()})${extension}`;
				await time.msleep(10);
			}
			if (counter >= 1100) throw new Error('Cannot find unique filename');
		}
	}

	async removeAllThatStartWith(dirPath, filenameStart) {
		if (!filenameStart || !dirPath) throw new Error('dirPath and filenameStart cannot be empty');

		const stats = await this.readDirStats(dirPath);

		for (const stat of stats) {
			if (stat.path.indexOf(filenameStart) === 0) {
				await this.remove(`${dirPath}/${stat.path}`);
			}
		}
	}

	async waitTillExists(path, timeout = 10000) {
		const startTime = Date.now();

		while (true) {
			const e = await this.exists(path);
			if (e) return true;
			if (Date.now() - startTime > timeout) return false;
			await time.msleep(100);
		}
	}
}

module.exports = FsDriverBase;
