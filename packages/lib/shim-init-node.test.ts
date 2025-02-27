
const { shimInit } = require('./shim-init-node');
import shim from './shim';
import { setupDatabaseAndSynchronizer, supportDir } from './testing/test-utils';
import { copyFile } from 'fs-extra';

describe('shim-init-node', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		shimInit();
	});

	test('should set the correct mime for a PDF file even if the extension is missing', async () => {
		const filePath = `${supportDir}/valid_pdf_without_ext`;
		const resource = await shim.createResourceFromPath(filePath);

		expect(resource.mime).toBe('application/pdf');
	});

	test('should preserve the file extension if one is provided regardless of the mime type', async () => {
		const originalFilePath = `${supportDir}/valid_pdf_without_ext`;
		const fileWithDifferentExtension = `${originalFilePath}.mscz`;
		await copyFile(originalFilePath, fileWithDifferentExtension);

		const resource = await shim.createResourceFromPath(fileWithDifferentExtension);

		expect(resource.file_extension).toBe('mscz');
	});

});
