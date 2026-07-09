import {
	deleteEncryptedProfilePlaintextBackup,
	encryptedProfilePlaintextBackupExists,
} from '@joplin/lib/services/encryptedProfile/backup';
import { pathExists, remove } from 'fs-extra';

export const profileHasPlaintextMigrationBackup = async (profileDir: string) => {
	return await encryptedProfilePlaintextBackupExists(profileDir, pathExists);
};

export const deletePlaintextMigrationBackupForProfile = async (profileDir: string) => {
	return await deleteEncryptedProfilePlaintextBackup(profileDir, { pathExists, remove });
};
