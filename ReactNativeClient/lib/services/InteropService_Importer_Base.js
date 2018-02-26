class InteropService_Importer_Base {

	async init(sourcePath, options) {
		this.sourcePath_ = sourcePath;
		this.options_ = options;
	}

	async exec(result) {}

	async temporaryDirectory_(createIt) {
		const md5 = require('md5');
		const tempDir = require('os').tmpdir() + '/' + md5(Math.random() + Date.now());
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}

}

module.exports = InteropService_Importer_Base;