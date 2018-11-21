const { filename, fileExtension } = require('lib/path-utils');

class FsDriverBase {

	async isDirectory(path) {
		const stat = await this.stat(path);
		return !stat ? false : stat.isDirectory();
	}

	async readDirStatsHandleRecursion_(basePath, stat, output, options) {
		if (options.recursive && stat.isDirectory()) {
			const subPath = basePath + '/' + stat.path;
			const subStats = await this.readDirStats(subPath, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				subStat.path = stat.path + '/' + subStat.path;
				output.push(subStat);
			}
		}

		return output;
	}

	async findUniqueFilename(name) {
		let counter = 1;

		let nameNoExt = filename(name, true);
		let extension = fileExtension(name);
		if (extension) extension = '.' + extension;
		let nameToTry = nameNoExt + extension;
		while (true) {
			const exists = await this.exists(nameToTry);
			if (!exists) return nameToTry;
			nameToTry = nameNoExt + ' (' + counter + ')' + extension;
			counter++;
			if (counter >= 1000) nameToTry = nameNoExt + ' (' + ((new Date()).getTime()) + ')' + extension;
			if (counter >= 10000) throw new Error('Cannot find unique title');
		}
	}

}

module.exports = FsDriverBase;