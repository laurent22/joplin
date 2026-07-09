import * as os from 'os';
import * as path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { promisify } from 'util';
import shim from '@joplin/lib/shim';
import { unlockDatabaseKeyFromMetadata } from '@joplin/lib/services/encryptedProfile/metadata';
import { encryptedProfileMetadataFileName } from '@joplin/lib/services/encryptedProfile/types';
import { desktopSqlCipherModulePresent, desktopUsesSqlCipherModule, loadDesktopSqliteModuleAfterProbe, probeDesktopSqlCipherCapability } from './loadDesktopSqliteModule';
import {
	defaultEncryptExistingProfileDatabaseDeps,
	runPendingEncryptedProfileMigration,
	scheduleEncryptedProfileMigration,
} from './encryptExistingProfileDatabase';

const secretBody = 'secret note body';

const createPlaintextDatabase = async (databasePath: string) => {
	const sqlite3 = require('sqlite3');
	const db = await new Promise<InstanceType<ReturnType<typeof sqlite3.verbose>['Database']>>((resolve, reject) => {
		const verbose = sqlite3.verbose();
		const instance = new verbose.Database(databasePath, verbose.OPEN_READWRITE | verbose.OPEN_CREATE, (error: Error | null) => {
			if (error) reject(error);
			else resolve(instance);
		});
	});
	const run = promisify(db.run.bind(db));
	const close = promisify(db.close.bind(db));
	try {
		await run('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)');
		await run('INSERT INTO notes (body) VALUES (?)', secretBody);
	} finally {
		await close();
	}
};

const queryPlainSqlite = async (databasePath: string, sql: string) => {
	const sqlite3 = require('sqlite3');
	const db = await new Promise<InstanceType<ReturnType<typeof sqlite3.verbose>['Database']>>((resolve, reject) => {
		const verbose = sqlite3.verbose();
		const instance = new verbose.Database(databasePath, verbose.OPEN_READONLY, (error: Error | null) => {
			if (error) reject(error);
			else resolve(instance);
		});
	});
	const get = promisify(db.get.bind(db));
	const close = promisify(db.close.bind(db));
	try {
		return await get(sql);
	} finally {
		await close();
	}
};

const querySqlCipher = async (databasePath: string, databaseKeyHex: string, sql: string) => {
	const { DatabaseDriverNode } = await import('@joplin/lib/database-driver-node');
	const driver = new DatabaseDriverNode();
	await driver.open({ name: databasePath, keyHex: databaseKeyHex });
	try {
		return await driver.selectOne(sql, []);
	} finally {
		await driver.close();
	}
};

describe('EncryptedProfile SQLCipher E2E tests', () => {
	(desktopSqlCipherModulePresent() ? describe : describe.skip)('Encrypted profile SQLCipher migration E2E', () => {
		let profileDir: string;

		beforeAll(async () => {
			const probe = await probeDesktopSqlCipherCapability();
			expect(probe.available).toBe(true);
			shim.setNodeSqlite(await loadDesktopSqliteModuleAfterProbe());
		});

		beforeEach(async () => {
			profileDir = await mkdtemp(path.join(os.tmpdir(), 'joplin-encrypted-profile-e2e-'));
			await createPlaintextDatabase(`${profileDir}/database.sqlite`);
		});

		afterEach(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
			await rm(profileDir, { recursive: true, force: true });
		});

		it('encrypts database.sqlite end-to-end with backup and key verification', async () => {
			expect(desktopUsesSqlCipherModule()).toBe(true);

			const password = 'correct-horse-battery-staple';
			const scheduleResult = await scheduleEncryptedProfileMigration(profileDir, password);
			expect(scheduleResult.success).toBe(true);
			expect(scheduleResult.metadata?.migrationState).toBe('pending');
			expect(scheduleResult.metadata?.enabled).toBe(false);

			const databaseKeyHex = await unlockDatabaseKeyFromMetadata(password, scheduleResult.metadata!);
			expect(databaseKeyHex).toBeTruthy();

			const migrationResult = await runPendingEncryptedProfileMigration(profileDir, databaseKeyHex!, defaultEncryptExistingProfileDatabaseDeps());
			expect(migrationResult.success).toBe(true);
			expect(migrationResult.metadata?.enabled).toBe(true);
			expect(migrationResult.metadata?.migrationState).toBe('complete');

			const databasePath = `${profileDir}/database.sqlite`;
			const backupPath = `${profileDir}/database.sqlite.before-encryption-backup`;
			const metadataPath = `${profileDir}/${encryptedProfileMetadataFileName}`;

			const backupRow = await queryPlainSqlite(backupPath, 'SELECT body FROM notes LIMIT 1');
			expect(backupRow).toEqual({ body: secretBody });

			let plainReadFailed = false;
			try {
				await queryPlainSqlite(databasePath, 'SELECT body FROM notes LIMIT 1');
			} catch {
				plainReadFailed = true;
			}
			expect(plainReadFailed).toBe(true);

			const encryptedRow = await querySqlCipher(databasePath, databaseKeyHex!, 'SELECT body FROM notes LIMIT 1');
			expect(encryptedRow).toEqual({ body: secretBody });

			let wrongKeyFailed = false;
			try {
				await querySqlCipher(databasePath, `${'0'.repeat(64)}`, 'SELECT body FROM notes LIMIT 1');
			} catch {
				wrongKeyFailed = true;
			}
			expect(wrongKeyFailed).toBe(true);

			const fs = await import('fs-extra');
			expect(await fs.pathExists(metadataPath)).toBe(true);
			expect(await fs.pathExists(backupPath)).toBe(true);
		});
	});
});
