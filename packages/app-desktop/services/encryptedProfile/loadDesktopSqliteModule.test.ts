import { desktopSqlCipherModulePresent, probeDesktopSqlCipherCapability } from './loadDesktopSqliteModule';

describe('loadDesktopSqliteModule SQLCipher capability probe', () => {
	(desktopSqlCipherModulePresent() ? describe : describe.skip)('when @journeyapps/sqlcipher is installed', () => {
		it('requires the module and verifies PRAGMA cipher_version', async () => {
			const probe = await probeDesktopSqlCipherCapability();
			expect(probe.available).toBe(true);
			expect(probe.cipherVersion).toMatch(/^\d+\.\d+/);
		});
	});
});
