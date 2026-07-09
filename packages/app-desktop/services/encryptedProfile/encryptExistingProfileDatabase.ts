import { DatabaseDriverNode } from '@joplin/lib/database-driver-node';
import {
	buildMigrationPaths,
	encryptPlainDatabaseFile,
	SqlCipherExportDriver,
	verifyEncryptedDatabaseKey,
	verifyWrongEncryptedDatabaseKeyFails,
} from '@joplin/lib/services/encryptedProfile/migration';
import {
	createEncryptedProfileMetadata,
	readEncryptedProfileMetadata,
	writeEncryptedProfileMetadata,
} from '@joplin/lib/services/encryptedProfile/metadata';
import { validateEncryptedProfilePassword } from '@joplin/lib/services/encryptedProfile/EncryptedProfileService';
import { EncryptedProfileMetadata } from '@joplin/lib/services/encryptedProfile/types';
import { copyFile, move, pathExists, remove } from 'fs-extra';

export interface EncryptExistingProfileDatabaseDeps {
	copyFile: (from: string, to: string)=> Promise<void>;
	move: (from: string, to: string, options?: { overwrite?: boolean })=> Promise<void>;
	pathExists: (path: string)=> Promise<boolean>;
	remove: (path: string)=> Promise<void>;
	readFile: (path: string)=> Promise<string>;
	writeFile: (path: string, content: string)=> Promise<void>;
	openPlainDatabase: (path: string)=> Promise<SqlCipherExportDriver>;
	openEncryptedDatabase: (path: string, databaseKeyHex: string)=> Promise<SqlCipherExportDriver>;
}

const createSqlCipherDriver = (databaseKeyHex?: string) => {
	return {
		open: async (path: string) => {
			const driver = new DatabaseDriverNode();
			await driver.open({ name: path, keyHex: databaseKeyHex });
			return {
				exec: async (sql: string) => {
					await driver.exec(sql);
				},
				close: async () => {
					await driver.close();
				},
			};
		},
	};
};

export const defaultEncryptExistingProfileDatabaseDeps = (): EncryptExistingProfileDatabaseDeps => ({
	copyFile,
	move,
	pathExists,
	remove,
	readFile: async (path) => {
		const fs = await import('fs-extra');
		return await fs.readFile(path, 'utf8');
	},
	writeFile: async (path, content) => {
		const fs = await import('fs-extra');
		await fs.writeFile(path, content, 'utf8');
	},
	openPlainDatabase: async (path) => {
		return await createSqlCipherDriver().open(path);
	},
	openEncryptedDatabase: async (path, databaseKeyHex) => {
		return await createSqlCipherDriver(databaseKeyHex).open(path);
	},
});

const writeProfileMetadata = async (profileDir: string, metadata: EncryptedProfileMetadata, deps: EncryptExistingProfileDatabaseDeps) => {
	await writeEncryptedProfileMetadata(profileDir, metadata, deps.writeFile);
};

const isBusyError = (error: unknown) => {
	return !!error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'EBUSY';
};

const withBusyRetry = async (operation: ()=> Promise<void>, attempts = 20) => {
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			await operation();
			return;
		} catch (error) {
			lastError = error;
			if (!isBusyError(error) || attempt === attempts - 1) throw error;
			await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
		}
	}
	throw lastError;
};

export interface EncryptExistingProfileDatabaseResult {
	success: boolean;
	metadata?: EncryptedProfileMetadata;
	error?: string;
}

export const scheduleEncryptedProfileMigration = async (
	profileDir: string,
	password: string,
	deps: EncryptExistingProfileDatabaseDeps = defaultEncryptExistingProfileDatabaseDeps(),
): Promise<EncryptExistingProfileDatabaseResult> => {
	const paths = buildMigrationPaths(profileDir);
	if (!(await deps.pathExists(paths.plainDatabasePath))) {
		return { success: false, error: 'Database file does not exist.' };
	}

	const existing = await readEncryptedProfileMetadata(profileDir, deps.readFile);
	if (existing?.enabled && existing.migrationState === 'complete') {
		return { success: false, error: 'Encrypted profile is already enabled.' };
	}
	if (existing?.migrationState === 'pending') {
		return { success: false, error: 'Encrypted profile migration is already scheduled.' };
	}

	try {
		validateEncryptedProfilePassword(password);
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	const { metadata } = await createEncryptedProfileMetadata(password, 'pending');
	await writeProfileMetadata(profileDir, metadata, deps);
	return { success: true, metadata };
};

export const runPendingEncryptedProfileMigration = async (
	profileDir: string,
	databaseKeyHex: string,
	deps: EncryptExistingProfileDatabaseDeps = defaultEncryptExistingProfileDatabaseDeps(),
): Promise<EncryptExistingProfileDatabaseResult> => {
	const paths = buildMigrationPaths(profileDir);
	const existing = await readEncryptedProfileMetadata(profileDir, deps.readFile);
	if (!existing || existing.migrationState !== 'pending') {
		return { success: false, error: 'No pending encrypted profile migration.' };
	}
	if (!(await deps.pathExists(paths.plainDatabasePath))) {
		return { success: false, error: 'Database file does not exist.' };
	}

	try {
		await deps.copyFile(paths.plainDatabasePath, paths.backupDatabasePath);
		await encryptPlainDatabaseFile({
			plainDatabasePath: paths.plainDatabasePath,
			encryptedDatabasePath: paths.encryptedDatabasePath,
			databaseKeyHex,
			openPlainDatabase: deps.openPlainDatabase,
		});

		const validKey = await verifyEncryptedDatabaseKey(paths.encryptedDatabasePath, databaseKeyHex, deps.openEncryptedDatabase);
		if (!validKey) {
			throw new Error('Encrypted database verification failed.');
		}

		const wrongKeyFails = await verifyWrongEncryptedDatabaseKeyFails(paths.encryptedDatabasePath, `${'0'.repeat(64)}`, deps.openEncryptedDatabase);
		if (!wrongKeyFails) {
			throw new Error('Wrong key unexpectedly opened encrypted database.');
		}

		await new Promise(resolve => setTimeout(resolve, 200));
		await withBusyRetry(async () => {
			await deps.move(paths.encryptedDatabasePath, paths.plainDatabasePath, { overwrite: true });
		});
		const completedMetadata: EncryptedProfileMetadata = {
			...existing,
			enabled: true,
			migrationState: 'complete',
			updatedAt: new Date().toISOString(),
		};
		await writeProfileMetadata(profileDir, completedMetadata, deps);
		return { success: true, metadata: completedMetadata };
	} catch (error) {
		if (await deps.pathExists(paths.backupDatabasePath)) {
			await deps.copyFile(paths.backupDatabasePath, paths.plainDatabasePath);
		}
		if (await deps.pathExists(paths.encryptedDatabasePath)) {
			await withBusyRetry(async () => {
				await deps.remove(paths.encryptedDatabasePath);
			});
		}
		const failedMetadata: EncryptedProfileMetadata = {
			...existing,
			enabled: false,
			migrationState: 'failed',
			updatedAt: new Date().toISOString(),
		};
		await writeProfileMetadata(profileDir, failedMetadata, deps);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
};
