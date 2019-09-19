const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
const InteropService_Importer_Raw = require('lib/services/InteropService_Importer_Raw');
const { filename } = require('lib/path-utils.js');
const fs = require('fs-extra');

class InteropService_Importer_Jex extends InteropService_Importer_Base {
	async exec(result) {
		const tempDir = await this.temporaryDirectory_(true);

		try {
			await require('tar').extract({
				strict: true,
				portable: true,
				file: this.sourcePath_,
				cwd: tempDir,
			});
		} catch (error) {
			let msg = [`Cannot untar file ${this.sourcePath_}`, error.message];
			if (error.data) msg.push(JSON.stringify(error.data));
			let e = new Error(msg.join(': '));
			throw e;
		}

		if (!('defaultFolderTitle' in this.options_)) this.options_.defaultFolderTitle = filename(this.sourcePath_);

		const importer = new InteropService_Importer_Raw();
		await importer.init(tempDir, this.options_);
		result = await importer.exec(result);

		await fs.remove(tempDir);

		return result;
	}
}

module.exports = InteropService_Importer_Jex;
