import { createEncryptedProfileMetadata, encryptedProfileMetadataPath } from '@joplin/lib/services/encryptedProfile/metadata';
import { buildMigrationPaths } from '@joplin/lib/services/encryptedProfile/migration';
import {
	scheduleEncryptedProfileMigration,
} from './encryptExistingProfileDatabase';
import { scheduleEncryptedProfileMigrationAndRestart } from './scheduleEncryptedProfileMigrationAndRestart';

describe('scheduleEncryptedProfileMigrationAndRestart', () => {
	const profileDir = '/tmp/joplin-encrypted-profile-restart-test';
	const migrationPaths = buildMigrationPaths(profileDir);
	const metadataPath = encryptedProfileMetadataPath(profileDir);
	const databasePath = migrationPaths.plainDatabasePath;

	test('calls restart after scheduling migration', async () => {
		const files = new Map<string, string>();
		const exists = new Set<string>([databasePath]);
		const restart = jest.fn(async () => ({ requiresManualRestart: false }));
		const deps = {
			copyFile: async () => {},
			move: async () => {},
			pathExists: async (path: string) => exists.has(path),
			remove: async () => {},
			readFile: async (path: string) => {
				const content = files.get(path);
				if (!content) throw new Error(`missing file ${path}`);
				return content;
			},
			writeFile: async (path: string, content: string) => {
				files.set(path, content);
				exists.add(path);
			},
			openPlainDatabase: async () => ({
				exec: async () => {},
				close: async () => {},
			}),
			openEncryptedDatabase: async () => ({
				exec: async () => {},
				close: async () => {},
			}),
		};

		const result = await scheduleEncryptedProfileMigrationAndRestart(
			profileDir,
			'correct-horse-battery-staple',
			{
				schedule: (dir, password) => scheduleEncryptedProfileMigration(dir, password, deps),
				restart,
			},
		);

		expect(result.success).toBe(true);
		expect(result.restartAttempted).toBe(true);
		expect(result.restartResult).toEqual({ requiresManualRestart: false });
		expect(restart).toHaveBeenCalledTimes(1);
		expect(files.has(metadataPath)).toBe(true);
	});

	test('does not call restart when scheduling fails', async () => {
		const restart = jest.fn(async () => ({ requiresManualRestart: false }));
		const files = new Map<string, string>();
		const exists = new Set<string>([databasePath]);
		const { metadata } = await createEncryptedProfileMetadata('correct-horse-battery-staple', 'pending');
		const deps = {
			copyFile: async () => {},
			move: async () => {},
			pathExists: async (path: string) => exists.has(path),
			remove: async () => {},
			readFile: async (path: string) => {
				const content = files.get(path);
				if (!content) throw new Error(`missing file ${path}`);
				return content;
			},
			writeFile: async (path: string, content: string) => {
				files.set(path, content);
				exists.add(path);
			},
			openPlainDatabase: async () => ({
				exec: async () => {},
				close: async () => {},
			}),
			openEncryptedDatabase: async () => ({
				exec: async () => {},
				close: async () => {},
			}),
		};
		await deps.writeFile(metadataPath, JSON.stringify(metadata));

		const result = await scheduleEncryptedProfileMigrationAndRestart(
			profileDir,
			'correct-horse-battery-staple',
			{
				schedule: (dir, password) => scheduleEncryptedProfileMigration(dir, password, deps),
				restart,
			},
		);

		expect(result.success).toBe(false);
		expect(result.restartAttempted).toBeUndefined();
		expect(restart).not.toHaveBeenCalled();
	});
});
