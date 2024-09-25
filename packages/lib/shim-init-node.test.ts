
const { shimInit } = require('./shim-init-node');
import shim from './shim';
import { setupDatabaseAndSynchronizer, supportDir } from './testing/test-utils';

describe('shim-init-node', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		shimInit();
	});

	test('should set mime the correct mime for a PDF file even if the extension is missing', async () => {
		const filePath = `${supportDir}/valid_pdf_without_ext`;
		const resource = await shim.createResourceFromPath(filePath);

		expect(resource.mime).toBe('application/pdf');
	});
});
