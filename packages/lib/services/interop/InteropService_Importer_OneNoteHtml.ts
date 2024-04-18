import htmlUtils from '../../htmlUtils';
import { fileExtension } from '../../path-utils';
import shim from '../../shim';
import { stripBom } from '../../string-utils';
import InteropService_Importer_Md from './InteropService_Importer_Md';

export default class InteropService_Importer_OneNoteHtml extends InteropService_Importer_Md {

	public async importFile(filePath: string, parentFolderId: string) {
		const resolvedPath = shim.fsDriver().resolve(filePath);
		if (this.importedNotes[resolvedPath]) return this.importedNotes[resolvedPath];

		const stat = await shim.fsDriver().stat(resolvedPath);
		if (!stat) throw new Error(`Cannot read ${resolvedPath}`);
		const ext = fileExtension(resolvedPath);
		if (ext !== 'html') return super.importFile(filePath, parentFolderId);

		const body = stripBom(await shim.fsDriver().readFile(resolvedPath));
		const newBody = htmlUtils.replaceOneNoteEmbedTagsToAnchor(body);
		await shim.fsDriver().writeFile(resolvedPath, newBody, 'utf-8');

		return super.importFile(filePath, parentFolderId);
	}
}
