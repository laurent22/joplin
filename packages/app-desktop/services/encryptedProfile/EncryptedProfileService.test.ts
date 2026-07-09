import { createEncryptedProfileMetadata } from '@joplin/lib/services/encryptedProfile/metadata';
import { decideEncryptedProfileStartupAction } from '@joplin/lib/services/encryptedProfile/EncryptedProfileService';
import { desktopSqlCipherModulePresent, desktopUsesSqlCipherModule, probeDesktopSqlCipherCapability } from './loadDesktopSqliteModule';
import {
	defaultEncryptExistingProfileDatabaseDeps,
	runPendingEncryptedProfileMigration,
	scheduleEncryptedProfileMigration,
} from './encryptExistingProfileDatabase';
import { resolveDesktopProfilePaths } from './resolveProfileDir';
import { shouldLockOnStartup } from '../appLock/AppLockService';
import { buildMigrationPaths } from '@joplin/lib/services/encryptedProfile/migration';
import { encryptedProfileMetadataPath } from '@joplin/lib/services/encryptedProfile/metadata';

describe('Encrypted profile desktop integration', () => {
	beforeAll(async () => {
		await probeDesktopSqlCipherCapability();
	});

	it('does not require unlock for profiles without metadata', async () => {
		const paths = await resolveDesktopProfilePaths(['node', '.', '--env', 'dev', '--profile', '/tmp/joplin-profile-test-empty']);
		expect(paths.requiresUnlock).toBe(false);
		expect(paths.requiresPendingMigration).toBe(false);
		expect(decideEncryptedProfileStartupAction(paths.metadata, desktopUsesSqlCipherModule())).toBe('none');
	});

	it('parses --profile from argv', async () => {
		const customProfile = '/tmp/joplin-custom-profile-dir';
		const paths = await resolveDesktopProfilePaths(['node', '.', '--env', 'dev', '--profile', customProfile]);
		expect(paths.rootProfileDir).toContain('joplin-custom-profile-dir');
	});

	it('parses --alt-instance-id from argv without regression', async () => {
		const paths = await resolveDesktopProfilePaths(['node', '.', '--env', 'dev', '--alt-instance-id', 'test-instance']);
		expect(paths.rootProfileDir).toContain('test-instance');
	});

	it('coexists with app lock startup settings shape', async () => {
		expect(shouldLockOnStartup({
			'security.appLock.enabled': true,
			'security.appLock.lockOnStartup': true,
			'security.appLock.passwordHash': {},
		})).toBe(false);
	});

	it('resolves pending metadata as migration without unlock', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'pending');
		expect(decideEncryptedProfileStartupAction(metadata, true)).toBe('migrate');
		expect(decideEncryptedProfileStartupAction(metadata, false)).toBe('errorSqlCipherUnavailable');
	});

	it('resolves complete metadata as unlock', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'complete');
		expect(decideEncryptedProfileStartupAction(metadata, true)).toBe('unlock');
	});

	it('resolves failed metadata as no unlock or migration', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata: completeMetadata } = await createEncryptedProfileMetadata(password, 'complete');
		const failedMetadata = {
			...completeMetadata,
			enabled: false,
			migrationState: 'failed' as const,
		};
		expect(decideEncryptedProfileStartupAction(failedMetadata, true)).toBe('none');
	});

	const sqlCipherDescribe = desktopSqlCipherModulePresent() ? describe : describe.skip;
	sqlCipherDescribe('SQLCipher native module', () => {
		it('reports SQLCipher capability after probe', async () => {
			const probe = await probeDesktopSqlCipherCapability();
			expect(probe.available).toBe(true);
			expect(probe.cipherVersion).toBeTruthy();
			expect(desktopUsesSqlCipherModule()).toBe(true);
		});
	});

	describe('migration service', () => {
		const profileDir = '/tmp/joplin-encrypted-profile-test';
		const migrationPaths = buildMigrationPaths(profileDir);
		const databasePath = migrationPaths.plainDatabasePath;
		const metadataPath = encryptedProfileMetadataPath(profileDir);
		const backupPath = migrationPaths.backupDatabasePath;
		const encryptedTempPath = migrationPaths.encryptedDatabasePath;

		const createDeps = (overrides: Partial<ReturnType<typeof defaultEncryptExistingProfileDatabaseDeps>> = {}) => {
			const files = new Map<string, string>();
			const exists = new Set<string>([databasePath]);
			const copyCalls: [string, string][] = [];
			const removeCalls: string[] = [];
			const moveCalls: [string, string][] = [];
			let openPlainDatabase = overrides.openPlainDatabase;
			let openEncryptedDatabase = overrides.openEncryptedDatabase;

			if (!openPlainDatabase) {
				openPlainDatabase = async () => ({
					exec: async () => {},
					close: async () => {},
				});
			}
			if (!openEncryptedDatabase) {
				openEncryptedDatabase = async (_path, databaseKeyHex) => {
					if (databaseKeyHex === `${'0'.repeat(64)}`) {
						throw new Error('wrong key rejected at open');
					}
					return {
						exec: async () => {},
						close: async () => {},
					};
				};
			}

			return {
				deps: {
					copyFile: async (from: string, to: string) => {
						copyCalls.push([from, to]);
						exists.add(to);
					},
					move: async (from: string, to: string) => {
						moveCalls.push([from, to]);
						exists.delete(from);
						exists.add(to);
					},
					pathExists: async (path: string) => exists.has(path),
					remove: async (path: string) => {
						removeCalls.push(path);
						exists.delete(path);
					},
					readFile: async (path: string) => {
						const content = files.get(path);
						if (!content) throw new Error(`missing file ${path}`);
						return content;
					},
					writeFile: async (path: string, content: string) => {
						files.set(path, content);
						exists.add(path);
					},
					openPlainDatabase,
					openEncryptedDatabase,
				},
				files,
				copyCalls,
				moveCalls,
				removeCalls,
			};
		};

		it('scheduleEncryptedProfileMigration only writes pending metadata and does not touch database.sqlite', async () => {
			const { deps, files, copyCalls } = createDeps();
			const result = await scheduleEncryptedProfileMigration(profileDir, 'correct-horse-battery-staple', deps);
			expect(result.success).toBe(true);
			expect(result.metadata?.migrationState).toBe('pending');
			expect(result.metadata?.enabled).toBe(false);
			expect(files.has(metadataPath)).toBe(true);
			expect(copyCalls).toHaveLength(0);
		});

		it('schedule rejects when complete metadata exists', async () => {
			const password = 'correct-horse-battery-staple';
			const { metadata } = await createEncryptedProfileMetadata(password, 'complete');
			const { deps, files } = createDeps();
			await deps.writeFile(metadataPath, JSON.stringify(metadata));
			const result = await scheduleEncryptedProfileMigration(profileDir, password, deps);
			expect(result.success).toBe(false);
			expect(result.error).toContain('already enabled');
			expect(files.size).toBe(1);
		});

		it('schedule rejects when pending metadata exists', async () => {
			const password = 'correct-horse-battery-staple';
			const { metadata } = await createEncryptedProfileMetadata(password, 'pending');
			const { deps } = createDeps();
			await deps.writeFile(metadataPath, JSON.stringify(metadata));
			const result = await scheduleEncryptedProfileMigration(profileDir, password, deps);
			expect(result.success).toBe(false);
			expect(result.error).toContain('already scheduled');
		});

		it('schedule allows retry after failed migration', async () => {
			const password = 'correct-horse-battery-staple';
			const { metadata: completeMetadata } = await createEncryptedProfileMetadata(password, 'complete');
			const failedMetadata = {
				...completeMetadata,
				enabled: false,
				migrationState: 'failed' as const,
			};
			const { deps, files } = createDeps();
			await deps.writeFile(metadataPath, JSON.stringify(failedMetadata));
			const result = await scheduleEncryptedProfileMigration(profileDir, password, deps);
			expect(result.success).toBe(true);
			expect(result.metadata?.migrationState).toBe('pending');
			expect(JSON.parse(files.get(metadataPath) ?? '')).toMatchObject({
				enabled: false,
				migrationState: 'pending',
			});
		});

		it('schedule rejects short passwords', async () => {
			const { deps } = createDeps();
			const result = await scheduleEncryptedProfileMigration(profileDir, '1234567', deps);
			expect(result.success).toBe(false);
			expect(result.error).toContain('8');
		});

		it('runPendingEncryptedProfileMigration rejects when no pending metadata', async () => {
			const { deps } = createDeps();
			const result = await runPendingEncryptedProfileMigration(profileDir, `${'a'.repeat(64)}`, deps);
			expect(result.success).toBe(false);
			expect(result.error).toContain('No pending');
		});

		it('runPendingEncryptedProfileMigration completes migration on success', async () => {
			const password = 'correct-horse-battery-staple';
			const { metadata, databaseKeyHex } = await createEncryptedProfileMetadata(password, 'pending');
			const { deps, files, copyCalls, moveCalls } = createDeps();
			await deps.writeFile(metadataPath, JSON.stringify(metadata));

			const result = await runPendingEncryptedProfileMigration(profileDir, databaseKeyHex, deps);

			expect(result.success).toBe(true);
			expect(result.metadata?.enabled).toBe(true);
			expect(result.metadata?.migrationState).toBe('complete');
			expect(copyCalls[0]).toEqual([databasePath, backupPath]);
			expect(moveCalls[0]).toEqual([encryptedTempPath, databasePath]);
			expect(JSON.parse(files.get(metadataPath) ?? '')).toMatchObject({
				enabled: true,
				migrationState: 'complete',
			});
		});

		it('runPendingEncryptedProfileMigration restores backup and marks failed on error', async () => {
			const password = 'correct-horse-battery-staple';
			const { metadata, databaseKeyHex } = await createEncryptedProfileMetadata(password, 'pending');
			const { deps, files, copyCalls, removeCalls } = createDeps({
				openEncryptedDatabase: async (_path, keyHex) => {
					if (keyHex === `${'0'.repeat(64)}`) {
						throw new Error('wrong key rejected at open');
					}
					throw new Error('verification query failed');
				},
			});
			const originalPathExists = deps.pathExists;
			deps.pathExists = async (path: string) => {
				if (path === encryptedTempPath) return true;
				return originalPathExists(path);
			};
			await deps.writeFile(metadataPath, JSON.stringify(metadata));

			const result = await runPendingEncryptedProfileMigration(profileDir, databaseKeyHex, deps);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Encrypted database verification failed');
			expect(copyCalls).toEqual([
				[databasePath, backupPath],
				[backupPath, databasePath],
			]);
			expect(removeCalls).toContain(encryptedTempPath);
			expect(JSON.parse(files.get(metadataPath) ?? '')).toMatchObject({
				enabled: false,
				migrationState: 'failed',
			});
		});
	});
});
