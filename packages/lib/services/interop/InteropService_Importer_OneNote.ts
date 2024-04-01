import { ImportExportResult, ImportModuleOutputFormat } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import { NoteEntity } from '../database/types';
import { rtrimSlashes } from '../../path-utils';
import { oneNoteConverter } from 'onenote-converter';
import InteropService_Importer_Md from './InteropService_Importer_Md';

export default class InteropService_Importer_OneNote extends InteropService_Importer_Base {
	protected importedNotes: Record<string, NoteEntity> = {};

	public async exec(result: ImportExportResult) {

		const sourcePath = rtrimSlashes(this.sourcePath_);
		const tempDir = await this.temporaryDirectory_(true);
		await oneNoteConverter(sourcePath, tempDir);

		const importer = new InteropService_Importer_Md();
		importer.setMetadata({ fileExtensions: ['html'] });
		await importer.init(tempDir, {
			...this.options_,
			format: 'html',
			outputFormat: ImportModuleOutputFormat.Markdown,

		});
		result = await importer.exec(result);

		return result;
	}
}
