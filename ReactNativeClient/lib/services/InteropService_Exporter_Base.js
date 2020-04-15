/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

const Setting = require('lib/models/Setting');

class InteropService_Exporter_Base {
	constructor() {
		this.context_ = {};
	}

	async init(destDir, options = {}) {}
	async prepareForProcessingItemType(type, itemsToExport) {}
	async processItem(ItemClass, item) {}
	async processResource(resource, filePath) {}
	async close() {}

	setMetadata(md) {
		this.metadata_ = md;
	}

	metadata() {
		return this.metadata_;
	}

	updateContext(context) {
		this.context_ = Object.assign(this.context_, context);
	}

	context() {
		return this.context_;
	}

	async temporaryDirectory_(createIt) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await require('fs-extra').mkdirp(tempDir);
		return tempDir;
	}
}

module.exports = InteropService_Exporter_Base;
