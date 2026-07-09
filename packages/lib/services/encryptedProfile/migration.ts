export interface SqlCipherExportDriver {
	exec(sql: string): Promise<void>;
	close(): Promise<void>;
}

export interface EncryptPlainDatabaseOptions {
	plainDatabasePath: string;
	encryptedDatabasePath: string;
	databaseKeyHex: string;
	openPlainDatabase: (path: string)=> Promise<SqlCipherExportDriver>;
}

import formatSqlCipherHexKeyLiteral from './sqlcipherKeyLiteral';
import { encryptedProfilePlaintextBackupFileName } from './types';
import * as path from 'path';

export const encryptPlainDatabaseFile = async (options: EncryptPlainDatabaseOptions) => {
	const plainDriver = await options.openPlainDatabase(options.plainDatabasePath);
	try {
		const keyLiteral = formatSqlCipherHexKeyLiteral(options.databaseKeyHex);
		await plainDriver.exec(`ATTACH DATABASE '${options.encryptedDatabasePath.replace(/'/g, '\'\'')}' AS encrypted KEY ${keyLiteral}`);
		await plainDriver.exec('SELECT sqlcipher_export(\'encrypted\')');
		await plainDriver.exec('DETACH DATABASE encrypted');
	} finally {
		await plainDriver.close();
	}
};

export const verifyEncryptedDatabaseKey = async (
	databasePath: string,
	databaseKeyHex: string,
	openEncryptedDatabase: (path: string, databaseKeyHex: string)=> Promise<SqlCipherExportDriver>,
) => {
	try {
		const driver = await openEncryptedDatabase(databasePath, databaseKeyHex);
		try {
			await driver.exec('SELECT count(*) FROM sqlite_master');
			return true;
		} catch {
			return false;
		} finally {
			await driver.close();
		}
	} catch {
		return false;
	}
};

export const verifyWrongEncryptedDatabaseKeyFails = async (
	databasePath: string,
	wrongDatabaseKeyHex: string,
	openEncryptedDatabase: (path: string, databaseKeyHex: string)=> Promise<SqlCipherExportDriver>,
) => {
	return !(await verifyEncryptedDatabaseKey(databasePath, wrongDatabaseKeyHex, openEncryptedDatabase));
};

export interface MigrationPaths {
	plainDatabasePath: string;
	backupDatabasePath: string;
	encryptedDatabasePath: string;
}

export const buildMigrationPaths = (profileDir: string): MigrationPaths => ({
	plainDatabasePath: path.join(profileDir, 'database.sqlite'),
	backupDatabasePath: path.join(profileDir, encryptedProfilePlaintextBackupFileName),
	encryptedDatabasePath: path.join(profileDir, 'database.sqlite.encrypted-temp'),
});

export type MigrationRollbackResult = 'restored' | 'nothing-to-restore';

export const rollbackMigration = async (
	paths: MigrationPaths,
	copyFile: (from: string, to: string)=> Promise<void>,
	removeFile: (path: string)=> Promise<void>,
	fileExists: (path: string)=> Promise<boolean>,
): Promise<MigrationRollbackResult> => {
	if (await fileExists(paths.backupDatabasePath)) {
		await copyFile(paths.backupDatabasePath, paths.plainDatabasePath);
		if (await fileExists(paths.encryptedDatabasePath)) {
			await removeFile(paths.encryptedDatabasePath);
		}
		return 'restored';
	}
	return 'nothing-to-restore';
};
