import * as SQLite from 'expo-sqlite';
import DatabaseDriver, { DatabaseCloseOptions, DatabaseOpenOptions, SqlSelectParams } from '@joplin/lib/database-driver';
import * as RNFS from '@dr.pogodin/react-native-fs';
import { Platform } from 'react-native';
import { dirname } from 'path';

// For compatibility with react-native-sqlite-storage
const databaseDirectory = () =>
	Platform.select({
		ios: `${RNFS.LibraryDirectoryPath}/LocalDatabase/`,
		android: `${dirname(RNFS.DocumentDirectoryPath)}/databases/`,
	});

export default class DatabaseDriverReactNative implements DatabaseDriver {
	private lastInsertId_: string;
	private db_: SQLite.SQLiteDatabase;
	public constructor() {
		this.lastInsertId_ = null;
	}

	public async open(options: DatabaseOpenOptions) {
		const database = await SQLite.openDatabaseAsync(
			options.name,
			{},
			databaseDirectory(),
		);
		this.db_ = database;
	}

	public async deleteDatabase(options: DatabaseCloseOptions) {
		await SQLite.deleteDatabaseAsync(options.name, databaseDirectory());
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
		throw new Error(`No extension support for ${path} in react-native-sqlite-storage`);
	}

	public async exec(sql: string, params: SqlSelectParams = []) {
		await this.db_.runAsync(sql, params);
	}

	public lastInsertId() {
		return this.lastInsertId_;
	}
}
