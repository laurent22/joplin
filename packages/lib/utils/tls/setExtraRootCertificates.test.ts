import { remove, writeFile } from 'fs-extra';
import createLocalhostServer from '../../testing/createLocalhostServer';
import { createTempDir, expectNotThrow, expectThrow } from '../../testing/test-utils';
import { join } from 'path';
import shim from '../../shim';
import setExtraRootCertificates from './setExtraRootCertificates';

describe('setExtraRootCertificates', () => {
	it('should support loading extra root certificates from a directory', async () => {
		await using httpsServer1 = await createLocalhostServer((_req, res) => {
			res.writeHead(200);
			res.end('test 1!');
		}, { https: true });
		await using httpsServer2 = await createLocalhostServer((_req, res) => {
			res.writeHead(200);
			res.end('test 2!');
		}, { https: true });

		const tempDir = await createTempDir();
		try {
			await expectThrow(async () => await shim.fetch(httpsServer1.baseUrl));
			await expectThrow(async () => await shim.fetch(httpsServer2.baseUrl));

			await writeFile(join(tempDir, 'cert-1.pem'), httpsServer1.cert, 'utf-8');
			await writeFile(join(tempDir, 'cert-2.pem'), httpsServer2.cert, 'utf-8');

			await setExtraRootCertificates([{ path: tempDir }]);

			await expectNotThrow(async () => await shim.fetch(httpsServer2.baseUrl));
			await expectNotThrow(async () => await shim.fetch(httpsServer1.baseUrl));
		} finally {
			await remove(tempDir);
			await setExtraRootCertificates([]);
		}
	});
});
