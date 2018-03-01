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

}

module.exports = FsDriverBase;