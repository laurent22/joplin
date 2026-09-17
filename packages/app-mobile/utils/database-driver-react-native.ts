import * as SQLite from 'expo-sqlite';
import DatabaseDriver, { DatabaseCloseOptions, DatabaseOpenOptions, SqlSelectParams } from '@joplin/lib/database-driver';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { NativeModules, Platform } from 'react-native';
import shim from '@joplin/lib/shim';
import { join } from 'path';

// cspell:ignore NSURLI

const getDatabaseDirectory = async () => {
	let databaseDirectory;
	if (Platform.OS === 'ios') {
		databaseDirectory = `${RNFS.LibraryDirectoryPath}/LocalDatabase/`;
	} else if (Platform.OS === 'android') {
		databaseDirectory = NativeModules.SystemInformationPackage?.getConstants()?.databaseDirectory;
	}
	if (!databaseDirectory) throw new Error('Unable to determine database path.');

	if (!await shim.fsDriver().exists(databaseDirectory)) {
		// For compatibility with react-native-sqlite-storage, exclude the database
		// directory from iCloud backups:
		await RNFS.mkdir(databaseDirectory, { NSURLIsExcludedFromBackupKey: true });
	}
	return databaseDirectory;
};

export default class DatabaseDriverReactNative implements DatabaseDriver {
	private lastInsertId_: string;
	private db_: SQLite.SQLiteDatabase;
	public constructor() {
		this.lastInsertId_ = null;
	}

	public async open(options: DatabaseOpenOptions) {
		const database = await SQLite.openDatabaseAsync(
			options.name,
			{
				// Work around an FTS-related crash when closing the database (see https://github.com/expo/expo/38168)
				finalizeUnusedStatementsBeforeClosing: false,
			},
			await getDatabaseDirectory(),
		);
		// Write-ahead logging (https://sqlite.org/wal.html) helps avoid "database locked" errors
		// on Android (and, on iOS, seems to match the behavior of react-native-sqlite-storage
		// before migrating to expo-sqlite):
		await database.execAsync('PRAGMA journal_mode=WAL;');
		this.db_ = database;
	}

	public async deleteDatabase(options: DatabaseCloseOptions) {
		const databaseDirectory = await getDatabaseDirectory();
		await SQLite.deleteDatabaseAsync(options.name, databaseDirectory);

		// Workaround: Expo < SDK 56 does not delete database -wal, -shm, and -journal files.
		// Remove after upgrading Expo.
		// See https://github.com/expo/expo/pull/49125
		const databasePath = join(databaseDirectory, options.name);
		const toDelete = [`${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`];
		for (const path of toDelete) {
			if (await shim.fsDriver().exists(path)) {
				await shim.fsDriver().remove(path);
			}
		}
	}

	public sqliteErrorToJsError(error: Error) {
		return error;
	}

	public async selectOne(sql: string, params: SqlSelectParams = []) {
		return await this.db_.getFirstAsync(sql, params);
	}

	public async selectAll(sql: string, params: SqlSelectParams = []) {
		return await this.db_.getAllAsync(sql, params);
	}

	public loadExtension(path: string) {
		// Extensions need to be enabled via options when opening the database
		throw new Error(`No extension support for ${path} in expo-sqlite`);
	}

	public async exec(sql: string, params: SqlSelectParams = []) {
		const result = await this.db_.runAsync(sql, params);

		if (result.lastInsertRowId) {
			this.lastInsertId_ = String(result.lastInsertRowId);
		}
	}

	public lastInsertId() {
		return this.lastInsertId_;
	}
}
