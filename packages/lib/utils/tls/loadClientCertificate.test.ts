import { remove, writeFile } from 'fs-extra';
import { createTempDir } from '../../testing/test-utils';
import { join } from 'path';
import shim, { SetClientCertificateOptions } from '../../shim';
import loadClientCertificate from './loadClientCertificate';

describe('loadClientCertificate', () => {
	it('should correctly parse a domains.txt file', async () => {
		const tempDir = await createTempDir();
		const mock = jest.spyOn(shim, 'setClientCertificate');

		let clientCertificate: SetClientCertificateOptions|null = null;
		mock.mockImplementation(async (options) => {
			clientCertificate = options;
		});

		try {
			await writeFile(join(tempDir, 'client-cert.pem'), 'mock', 'utf-8');
			await writeFile(join(tempDir, 'client-key.pem'), 'mock', 'utf-8');
			await writeFile(join(tempDir, 'domains.txt'), '# Comment\n\n\nexample.com\r\nexample.net ', 'utf-8');

			await loadClientCertificate({
				'net.clientCertificate.password': '',
				'net.clientCertificate': tempDir,
			});

			expect(clientCertificate).toMatchObject({
				domains: ['example.com', 'example.net'],
			});
		} finally {
			mock.mockRestore();
			await remove(tempDir);
		}
	});
});
