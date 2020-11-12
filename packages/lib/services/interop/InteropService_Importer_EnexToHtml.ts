import { ImportExportResult } from './types';

const InteropService_Importer_Base = require('./InteropService_Importer_Base').default;
const Folder = require('../../models/Folder.js');
const { filename } = require('../../path-utils');

export default class InteropService_Importer_EnexToHtml extends InteropService_Importer_Base {
	async exec(result: ImportExportResult) {
		const { importEnex } = require('../../import-enex');

		let folder = this.options_.destinationFolder;

		if (!folder) {
			const folderTitle = await Folder.findUniqueItemTitle(filename(this.sourcePath_));
			folder = await Folder.save({ title: folderTitle });
		}

		await importEnex(folder.id, this.sourcePath_, { ...this.options_, outputFormat: 'html' });

		return result;
	}
}
