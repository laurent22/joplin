import {
	deleteEncryptedProfilePlaintextBackup,
	encryptedProfilePlaintextBackupExists,
	encryptedProfilePlaintextBackupFileName,
	isEncryptedProfilePlaintextBackupPath,
	resolveEncryptedProfilePlaintextBackupPath,
	encryptedProfilePlaintextBackupPathFromMigration,
} from './backup';

describe('EncryptedProfile plaintext backup helpers', () => {
	const profileDir = '/tmp/joplin-profile';

	it('resolves the expected backup file name in the profile directory', () => {
		expect(resolveEncryptedProfilePlaintextBackupPath(profileDir)).toContain(encryptedProfilePlaintextBackupFileName);
		expect(isEncryptedProfilePlaintextBackupPath(profileDir, `${profileDir}/${encryptedProfilePlaintextBackupFileName}`)).toBe(true);
		expect(isEncryptedProfilePlaintextBackupPath(profileDir, `${profileDir}/database.sqlite`)).toBe(false);
		expect(isEncryptedProfilePlaintextBackupPath(profileDir, '/tmp/other-profile/database.sqlite.before-encryption-backup')).toBe(false);
	});

	it('deletes only the exact backup file in the current profile', async () => {
		const backupPath = encryptedProfilePlaintextBackupPathFromMigration(profileDir);
		const removed: string[] = [];
		const result = await deleteEncryptedProfilePlaintextBackup(profileDir, {
			pathExists: async (path) => path === backupPath,
			remove: async (path) => {
				removed.push(path);
			},
		});
		expect(result).toBe('deleted');
		expect(removed).toEqual([backupPath]);
	});

	it('returns not-found when the backup file is absent', async () => {
		const result = await deleteEncryptedProfilePlaintextBackup(profileDir, {
			pathExists: async () => false,
			remove: async () => {},
		});
		expect(result).toBe('not-found');
	});

	it('reports whether the backup file exists', async () => {
		const backupPath = encryptedProfilePlaintextBackupPathFromMigration(profileDir);
		expect(await encryptedProfilePlaintextBackupExists(profileDir, async (path) => path === backupPath)).toBe(true);
		expect(await encryptedProfilePlaintextBackupExists(profileDir, async () => false)).toBe(false);
	});
});
