import * as path from 'path';
import { buildMigrationPaths } from './migration';
import { encryptedProfilePlaintextBackupFileName } from './types';

export { encryptedProfilePlaintextBackupFileName };

export const resolveEncryptedProfilePlaintextBackupPath = (profileDir: string) => {
	return buildMigrationPaths(profileDir).backupDatabasePath;
};

export const isEncryptedProfilePlaintextBackupPath = (profileDir: string, candidatePath: string) => {
	return path.resolve(candidatePath) === path.resolve(resolveEncryptedProfilePlaintextBackupPath(profileDir));
};

export const encryptedProfilePlaintextBackupPathFromMigration = (profileDir: string) => {
	return resolveEncryptedProfilePlaintextBackupPath(profileDir);
};

export type DeleteEncryptedProfilePlaintextBackupResult = 'deleted' | 'not-found';

export const deleteEncryptedProfilePlaintextBackup = async (
	profileDir: string,
	deps: {
		pathExists: (path: string)=> Promise<boolean>;
		remove: (path: string)=> Promise<void>;
	},
): Promise<DeleteEncryptedProfilePlaintextBackupResult> => {
	const backupPath = encryptedProfilePlaintextBackupPathFromMigration(profileDir);
	if (!isEncryptedProfilePlaintextBackupPath(profileDir, backupPath)) {
		throw new Error('Refusing to delete unexpected encrypted profile backup path.');
	}
	if (!(await deps.pathExists(backupPath))) {
		return 'not-found';
	}
	await deps.remove(backupPath);
	return 'deleted';
};

export const encryptedProfilePlaintextBackupExists = async (
	profileDir: string,
	pathExists: (path: string)=> Promise<boolean>,
) => {
	const backupPath = encryptedProfilePlaintextBackupPathFromMigration(profileDir);
	if (!isEncryptedProfilePlaintextBackupPath(profileDir, backupPath)) {
		return false;
	}
	return await pathExists(backupPath);
};
