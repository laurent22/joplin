import { remove, writeFile } from 'fs-extra';
import { createTempDir, expectThrow, supportDir } from '../../testing/test-utils';
import { join } from 'path';
import shim, { SetClientCertificateOptions } from '../../shim';
import loadClientCertificate from './loadClientCertificate';

const mockSetClientCertificate = () => {
	const mock = jest.spyOn(shim, 'setClientCertificate');

	let clientCertificate: SetClientCertificateOptions|null = null;
	mock.mockImplementation(async (options) => {
		clientCertificate = options;
	});

	return {
		get clientCertificate() { return clientCertificate; },
		reset: () => mock.mockRestore(),
	};
};

describe('loadClientCertificate', () => {
	it('should correctly parse a domains.txt file', async () => {
		const tempDir = await createTempDir();
		const mock = mockSetClientCertificate();

		try {
			await writeFile(join(tempDir, 'client-cert.pem'), 'mock', 'utf-8');
			await writeFile(join(tempDir, 'client-key.pem'), 'mock', 'utf-8');
			await writeFile(join(tempDir, 'domains.txt'), '# Comment\n\n\nexample.com\r\nexample.net ', 'utf-8');

			await loadClientCertificate({
				'net.clientCertificate.password': '',
				'net.clientCertificate': tempDir,
			});

			expect(mock.clientCertificate).toMatchObject({
				domains: ['example.com', 'example.net'],
			});
		} finally {
			mock.reset();
			await remove(tempDir);
		}
	});

	it('should clear the client certificate when configuration fails', async () => {
		const mock = mockSetClientCertificate();
		try {
			const nonExistentPath = join(supportDir, 'does-not-exist');
			await shim.setClientCertificate({ certPath: nonExistentPath, keyPath: nonExistentPath, domains: [], keyPassword: '' });
			expect(mock.clientCertificate).toBeTruthy();

			await expectThrow(async () => {
				await loadClientCertificate({
					'net.clientCertificate.password': '',
					'net.clientCertificate': nonExistentPath,
				});
			});
			expect(mock.clientCertificate).toBeNull();
		} finally {
			mock.reset();
		}
	});
});
