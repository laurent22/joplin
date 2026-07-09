import {
	buildMigrationPaths,
	encryptPlainDatabaseFile,
	SqlCipherExportDriver,
	verifyEncryptedDatabaseKey,
	verifyWrongEncryptedDatabaseKeyFails,
} from './migration';
import * as path from 'path';

describe('EncryptedProfile migration helpers', () => {
	it('buildMigrationPaths returns stable paths', () => {
		const profileDir = '/tmp/profile';
		const paths = buildMigrationPaths(profileDir);
		expect(paths).toEqual({
			plainDatabasePath: path.join(profileDir, 'database.sqlite'),
			backupDatabasePath: path.join(profileDir, 'database.sqlite.before-encryption-backup'),
			encryptedDatabasePath: path.join(profileDir, 'database.sqlite.encrypted-temp'),
		});
	});

	it('verifyEncryptedDatabaseKey returns false on open-stage reject', async () => {
		const openEncryptedDatabase = async () => {
			throw new Error('open rejected');
		};
		expect(await verifyEncryptedDatabaseKey('/tmp/db', `${'a'.repeat(64)}`, openEncryptedDatabase)).toBe(false);
	});

	it('verifyEncryptedDatabaseKey returns false on exec-stage reject', async () => {
		const openEncryptedDatabase = async () => {
			return {
				exec: async () => {
					throw new Error('exec rejected');
				},
				close: async () => {},
			};
		};
		expect(await verifyEncryptedDatabaseKey('/tmp/db', `${'a'.repeat(64)}`, openEncryptedDatabase)).toBe(false);
	});

	it('verifyWrongEncryptedDatabaseKeyFails returns true on open-stage reject', async () => {
		const openEncryptedDatabase = async () => {
			throw new Error('open rejected');
		};
		expect(await verifyWrongEncryptedDatabaseKeyFails('/tmp/db', `${'0'.repeat(64)}`, openEncryptedDatabase)).toBe(true);
	});

	it('verifyWrongEncryptedDatabaseKeyFails returns false when wrong key can open', async () => {
		const openEncryptedDatabase = async () => {
			return {
				exec: async () => {},
				close: async () => {},
			};
		};
		expect(await verifyWrongEncryptedDatabaseKeyFails('/tmp/db', `${'0'.repeat(64)}`, openEncryptedDatabase)).toBe(false);
	});

	it('encryptPlainDatabaseFile executes ATTACH, sqlcipher_export, DETACH and closes driver on success', async () => {
		const execCalls: string[] = [];
		let closed = false;
		const driver: SqlCipherExportDriver = {
			exec: async (sql: string) => {
				execCalls.push(sql);
			},
			close: async () => {
				closed = true;
			},
		};
		await encryptPlainDatabaseFile({
			plainDatabasePath: '/tmp/plain.sqlite',
			encryptedDatabasePath: '/tmp/encrypted.sqlite',
			databaseKeyHex: `${'ab'.repeat(32)}`,
			openPlainDatabase: async () => driver,
		});
		expect(execCalls[0]).toContain('KEY "x\'');
		expect(execCalls[1]).toBe('SELECT sqlcipher_export(\'encrypted\')');
		expect(execCalls[2]).toBe('DETACH DATABASE encrypted');
		expect(closed).toBe(true);
	});

	it('encryptPlainDatabaseFile closes driver when export fails', async () => {
		let closed = false;
		const driver: SqlCipherExportDriver = {
			exec: async (sql: string) => {
				if (sql.includes('sqlcipher_export')) {
					throw new Error('export failed');
				}
			},
			close: async () => {
				closed = true;
			},
		};
		await expect(encryptPlainDatabaseFile({
			plainDatabasePath: '/tmp/plain.sqlite',
			encryptedDatabasePath: '/tmp/encrypted.sqlite',
			databaseKeyHex: `${'ab'.repeat(32)}`,
			openPlainDatabase: async () => driver,
		})).rejects.toThrow('export failed');
		expect(closed).toBe(true);
	});
});
