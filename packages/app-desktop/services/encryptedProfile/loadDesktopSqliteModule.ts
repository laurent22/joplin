import * as path from 'path';

export interface DesktopSqliteModule {
	verbose(): {
		Database: new(path: string, mode?: number, cb?: (error: Error | null)=> void)=> unknown;
		OPEN_READWRITE: number;
		OPEN_CREATE: number;
	};
}

export type DesktopSqlCipherProbeResult = {
	available: boolean;
	cipherVersion: string | null;
};

let cachedProbeResult: DesktopSqlCipherProbeResult | null = null;
let probePromise: Promise<DesktopSqlCipherProbeResult> | null = null;
let nodePreGypPrepared = false;

const rewriteAsarUnpackedPath = (filePath: string) => {
	const asarSegment = `${path.sep}app.asar${path.sep}`;
	const unpackedSegment = `${path.sep}app.asar.unpacked${path.sep}`;
	if (filePath.includes(asarSegment) && !filePath.includes(unpackedSegment)) {
		return filePath.replace(asarSegment, unpackedSegment);
	}
	return filePath;
};

const prepareNodePreGypForPackagedApp = () => {
	if (nodePreGypPrepared) return;
	nodePreGypPrepared = true;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- patches native binding resolution before SQLCipher loads
		const nodePreGyp = require('@mapbox/node-pre-gyp');
		const originalFind = nodePreGyp.find.bind(nodePreGyp);
		nodePreGyp.find = (packageJsonPath: string) => rewriteAsarUnpackedPath(originalFind(packageJsonPath));
	} catch {
		// node-pre-gyp is only needed when loading SQLCipher; ignore if unavailable.
	}
};

const loadDesktopSqlCipherModuleInternal = (): DesktopSqliteModule | null => {
	try {
		prepareNodePreGypForPackagedApp();
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- SQLCipher native module is loaded conditionally for encrypted profiles
		return require('@journeyapps/sqlcipher');
	} catch {
		return null;
	}
};

const queryCipherVersion = (sqliteModule: DesktopSqliteModule) => {
	return new Promise<string | null>((resolve) => {
		const verbose = sqliteModule.verbose();
		const db = new verbose.Database(':memory:', verbose.OPEN_READWRITE, (openError: Error | null) => {
			if (openError) {
				resolve(null);
				return;
			}

			(db as {
				get: (sql: string, cb: (error: Error | null, row: unknown)=> void)=> void;
				close: (cb: ()=> void)=> void;
			}).get('PRAGMA cipher_version', (getError: Error | null, row: unknown) => {
				let cipherVersion: string | null = null;
				if (!getError && row && typeof row === 'object' && 'cipher_version' in row) {
					const value = (row as { cipher_version?: unknown }).cipher_version;
					if (typeof value === 'string' && value.length > 0) {
						cipherVersion = value;
					}
				}

				(db as { close: (cb: ()=> void)=> void }).close(() => {
					resolve(cipherVersion);
				});
			});
		});
	});
};

export const probeDesktopSqlCipherCapability = async (): Promise<DesktopSqlCipherProbeResult> => {
	if (cachedProbeResult) return cachedProbeResult;
	if (probePromise) return probePromise;

	probePromise = (async () => {
		const module = loadDesktopSqlCipherModuleInternal();
		if (!module) {
			cachedProbeResult = { available: false, cipherVersion: null };
			return cachedProbeResult;
		}

		const cipherVersion = await queryCipherVersion(module);
		cachedProbeResult = {
			available: !!cipherVersion,
			cipherVersion,
		};
		return cachedProbeResult;
	})();

	return probePromise;
};

export const desktopSqlCipherModulePresent = () => {
	return !!loadDesktopSqlCipherModuleInternal();
};

export const loadDesktopSqlCipherModule = (): DesktopSqliteModule | null => {
	if (cachedProbeResult) {
		return cachedProbeResult.available ? loadDesktopSqlCipherModuleInternal() : null;
	}
	return loadDesktopSqlCipherModuleInternal();
};

const loadPlainSqliteModule = (): DesktopSqliteModule => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	return require('sqlite3');
};

export const loadDesktopSqliteModule = (): DesktopSqliteModule => {
	const sqlCipher = loadDesktopSqlCipherModule();
	if (sqlCipher) return sqlCipher;

	try {
		return loadPlainSqliteModule();
	} catch (error) {
		// eslint-disable-next-line no-console -- startup path runs before logger init
		console.warn('SQLite native module unavailable:', (error as Error).message);
		throw error;
	}
};

export const loadDesktopSqliteModuleAfterProbe = async (): Promise<DesktopSqliteModule> => {
	const probe = await probeDesktopSqlCipherCapability();
	if (probe.available) {
		const sqlCipher = loadDesktopSqlCipherModuleInternal();
		if (sqlCipher) return sqlCipher;
	}
	return loadPlainSqliteModule();
};

export const desktopUsesSqlCipherModule = () => {
	return cachedProbeResult?.available ?? false;
};
