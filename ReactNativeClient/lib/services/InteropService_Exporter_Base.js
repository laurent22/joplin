class InteropService_Exporter_Base {

	async init(destDir) {}
	async processItem(ItemClass, item) {}
	async processResource(resource, filePath) {}
	async close() {}

	async temporaryDirectory_(createIt) {
		const md5 = require('md5');
		const tempDir = require('os').tmpdir() + '/' + md5(Math.random() + Date.now());
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}

}

module.exports = InteropService_Exporter_Base;