const InteropService_Importer_Base = require('lib/services/InteropService_Importer_Base');
const Folder = require('lib/models/Folder.js');
const { filename } = require('lib/path-utils.js');

class InteropService_Importer_EnexToMd extends InteropService_Importer_Base {
	async exec(result) {
		const { importEnex } = require('lib/import-enex');

		let folder = this.options_.destinationFolder;

		if (!folder) {
			const folderTitle = await Folder.findUniqueItemTitle(filename(this.sourcePath_));
			folder = await Folder.save({ title: folderTitle });
		}

		await importEnex(folder.id, this.sourcePath_, this.options_);

		return result;
	}
}

module.exports = InteropService_Importer_EnexToMd;
