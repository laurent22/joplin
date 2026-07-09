import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import shim from '@joplin/lib/shim';
import { DatabaseDriverNode } from '@joplin/lib/database-driver-node';
import { readEncryptedProfileMetadata, unlockDatabaseKeyFromMetadata } from '@joplin/lib/services/encryptedProfile/metadata';
import {
	verifyEncryptedDatabaseKey,
	verifyWrongEncryptedDatabaseKeyFails,
} from '@joplin/lib/services/encryptedProfile/migration';
import { encryptedProfileMetadataFileName } from '@joplin/lib/services/encryptedProfile/types';
import { loadDesktopSqliteModule, probeDesktopSqlCipherCapability } from '../services/encryptedProfile/loadDesktopSqliteModule';

/* eslint-disable no-console */

type CheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

interface CheckResult {
	label: string;
	status: CheckStatus;
	detail?: string;
}

const profileDirFromEnv = process.env.JOPLIN_VERIFY_PROFILE ?? '';
const passwordFromEnv = process.env.JOPLIN_VERIFY_PASSWORD ?? '';

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

const openEncryptedDatabase = async (databasePath: string, databaseKeyHex: string) => {
	const driver = new DatabaseDriverNode();
	await driver.open({ name: databasePath, keyHex: databaseKeyHex });
	return {
		exec: async (sql: string) => {
			await driver.exec(sql);
		},
		close: async () => {
			await driver.close();
		},
	};
};

const querySqlCipher = async (databasePath: string, databaseKeyHex: string, sql: string) => {
	const driver = new DatabaseDriverNode();
	await driver.open({ name: databasePath, keyHex: databaseKeyHex });
	try {
		return await driver.selectOne(sql, []);
	} finally {
		await driver.close();
	}
};

const printResults = (profileDir: string, results: CheckResult[]) => {
	console.log('Encrypted Profile Verification');
	console.log(`Profile: ${profileDir}`);
	console.log('----------------------------------------');
	for (const result of results) {
		const suffix = result.detail ? ` — ${result.detail}` : '';
		console.log(`[${result.status}] ${result.label}${suffix}`);
	}
	const counted = results.filter(r => r.status === 'PASS' || r.status === 'FAIL');
	const passed = counted.filter(r => r.status === 'PASS').length;
	const failed = counted.filter(r => r.status === 'FAIL').length;
	console.log('----------------------------------------');
	console.log(`Result: ${passed}/${counted.length} checks passed${failed ? ` (${failed} failed)` : ''}`);
};

const runVerification = async (profileDir: string, password: string) => {
	const resolvedProfileDir = path.resolve(profileDir);
	const results: CheckResult[] = [];
	const databasePath = path.join(resolvedProfileDir, 'database.sqlite');
	const backupPath = path.join(resolvedProfileDir, 'database.sqlite.before-encryption-backup');
	const metadataPath = path.join(resolvedProfileDir, encryptedProfileMetadataFileName);
	const settingsPath = path.join(resolvedProfileDir, 'settings.json');

	const sqlCipherProbe = await probeDesktopSqlCipherCapability();
	shim.setNodeSqlite(loadDesktopSqliteModule());

	if (sqlCipherProbe.available) {
		results.push({
			label: 'SQLCipher native module available',
			status: 'PASS',
			detail: sqlCipherProbe.cipherVersion ? `cipher_version=${sqlCipherProbe.cipherVersion}` : undefined,
		});
	} else {
		results.push({
			label: 'SQLCipher native module available',
			status: 'FAIL',
			detail: '@journeyapps/sqlcipher not loaded',
		});
	}

	if (await fs.pathExists(metadataPath)) {
		results.push({ label: 'profile-encryption.json present', status: 'PASS' });
	} else {
		results.push({ label: 'profile-encryption.json present', status: 'FAIL' });
		printResults(resolvedProfileDir, results);
		throw new Error('profile-encryption.json missing');
	}

	const metadata = await readEncryptedProfileMetadata(resolvedProfileDir, async (filePath) => {
		return await fs.readFile(filePath, 'utf8');
	});

	if (metadata && metadata.migrationState === 'complete' && metadata.enabled) {
		results.push({
			label: 'Encrypted profile enabled (migration complete)',
			status: 'PASS',
		});
	} else {
		results.push({
			label: 'Encrypted profile enabled (migration complete)',
			status: 'FAIL',
			detail: metadata ? `migrationState=${metadata.migrationState}, enabled=${metadata.enabled}` : 'invalid metadata',
		});
	}

	if (await fs.pathExists(databasePath)) {
		results.push({ label: 'database.sqlite exists', status: 'PASS' });
	} else {
		results.push({ label: 'database.sqlite exists', status: 'FAIL' });
		printResults(resolvedProfileDir, results);
		throw new Error('database.sqlite missing');
	}

	if (await fs.pathExists(backupPath)) {
		results.push({
			label: 'Plaintext backup file present',
			status: 'WARN',
			detail: 'database.sqlite.before-encryption-backup — store or delete securely',
		});
	} else {
		results.push({
			label: 'Plaintext backup file present',
			status: 'WARN',
			detail: 'backup not found (may have been removed)',
		});
	}

	let plainReadFailed = false;
	try {
		await queryPlainSqlite(databasePath, 'SELECT count(*) AS count FROM sqlite_master');
	} catch {
		plainReadFailed = true;
	}
	results.push({
		label: 'Plain sqlite3 cannot read database.sqlite',
		status: plainReadFailed ? 'PASS' : 'FAIL',
		detail: plainReadFailed ? undefined : 'plain sqlite returned sqlite_master',
	});

	if (!password) {
		results.push({
			label: 'Correct password unlocks database key',
			status: 'SKIP',
			detail: 'set JOPLIN_VERIFY_PASSWORD to run key checks',
		});
		results.push({
			label: 'Correct key reads sqlite_master',
			status: 'SKIP',
			detail: 'set JOPLIN_VERIFY_PASSWORD to run key checks',
		});
		results.push({
			label: 'Wrong database key rejected',
			status: 'SKIP',
			detail: 'set JOPLIN_VERIFY_PASSWORD to run key checks',
		});
	} else if (!metadata) {
		results.push({ label: 'Correct password unlocks database key', status: 'FAIL', detail: 'no metadata' });
		results.push({ label: 'Correct key reads sqlite_master', status: 'FAIL', detail: 'no metadata' });
		results.push({ label: 'Wrong database key rejected', status: 'FAIL', detail: 'no metadata' });
	} else {
		const databaseKeyHex = await unlockDatabaseKeyFromMetadata(password, metadata);
		if (databaseKeyHex) {
			results.push({ label: 'Correct password unlocks database key', status: 'PASS' });
		} else {
			results.push({
				label: 'Correct password unlocks database key',
				status: 'FAIL',
				detail: 'password did not unwrap wrappedDatabaseKey',
			});
		}

		if (databaseKeyHex) {
			const keyValid = await verifyEncryptedDatabaseKey(databasePath, databaseKeyHex, openEncryptedDatabase);
			results.push({
				label: 'Correct key reads sqlite_master',
				status: keyValid ? 'PASS' : 'FAIL',
			});

			const wrongKeyRejected = await verifyWrongEncryptedDatabaseKeyFails(
				databasePath,
				`${'0'.repeat(64)}`,
				openEncryptedDatabase,
			);
			results.push({
				label: 'Wrong database key rejected',
				status: wrongKeyRejected ? 'PASS' : 'FAIL',
			});

			try {
				const row = await querySqlCipher(databasePath, databaseKeyHex, 'SELECT count(*) AS count FROM sqlite_master');
				const count = row && typeof row === 'object' && 'count' in row ? Number((row as { count: number }).count) : 0;
				results.push({
					label: 'Correct key can query database tables',
					status: count > 0 ? 'PASS' : 'FAIL',
					detail: count > 0 ? `${count} sqlite_master entries` : 'empty schema',
				});
			} catch (error) {
				results.push({
					label: 'Correct key can query database tables',
					status: 'FAIL',
					detail: error instanceof Error ? error.message : String(error),
				});
			}
		} else {
			results.push({ label: 'Correct key reads sqlite_master', status: 'FAIL', detail: 'skipped (no key)' });
			results.push({ label: 'Wrong database key rejected', status: 'FAIL', detail: 'skipped (no key)' });
		}
	}

	if (await fs.pathExists(settingsPath)) {
		const settingsContent = await fs.readFile(settingsPath, 'utf8');
		const settingsHasDatabaseKeyField = settingsContent.includes('security.encryptedProfile.databaseKey');
		const metadataContent = await fs.readFile(metadataPath, 'utf8');
		const passwordLeakedInMetadata = password ? metadataContent.includes(password) : false;
		const appLockConfigured = settingsContent.includes('security.appLock');

		if (!settingsHasDatabaseKeyField && !passwordLeakedInMetadata) {
			results.push({
				label: 'App Lock / encrypted profile settings kept separate',
				status: 'PASS',
				detail: appLockConfigured ? 'App Lock settings present in settings.json' : 'App Lock not configured',
			});
		} else {
			results.push({
				label: 'App Lock / encrypted profile settings kept separate',
				status: 'FAIL',
				detail: settingsHasDatabaseKeyField ? 'database key field in settings.json' : 'password found in profile-encryption.json',
			});
		}
	} else {
		results.push({
			label: 'App Lock / encrypted profile settings kept separate',
			status: 'WARN',
			detail: 'settings.json not found',
		});
	}

	printResults(resolvedProfileDir, results);

	const failed = results.some(r => r.status === 'FAIL');
	if (failed) throw new Error('One or more verification checks failed');
};

describe('Encrypted profile manual verification', () => {
	const runTest = profileDirFromEnv ? it : it.skip;
	runTest('prints file-level verification results for a profile directory', async () => {
		await runVerification(profileDirFromEnv, passwordFromEnv);
	}, 60000);
});
