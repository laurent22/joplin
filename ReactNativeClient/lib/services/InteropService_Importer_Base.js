const Setting = require('lib/models/Setting');

class InteropService_Importer_Base {
	setMetadata(md) {
		this.metadata_ = md;
	}

	metadata() {
		return this.metadata_;
	}

	async init(sourcePath, options) {
		this.sourcePath_ = sourcePath;
		this.options_ = options;
	}

	async exec() {}

	async temporaryDirectory_(createIt) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}
}

module.exports = InteropService_Importer_Base;
