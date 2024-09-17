import { DbConnection, versionCheck } from './db';
import { } from './env';
import { DatabaseConfigClient } from './utils/types';

describe('db', () => {

	const mockedDb = (version: string, client: DatabaseConfigClient = DatabaseConfigClient.PostgreSQL) => {
		return {
			select: () => {
				return {
					first: () => ({
						version,
					}),
				};
			}
			,
			raw: () => '',
			client: {
				config: { client },
			},
		} as unknown as DbConnection;
	};

	it.each(
		[
			'PostgreSQL 15.3 (Debian 15.3-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit',
			'PostgreSQL 16.3, compiled by Visual C++ build 1938, 64-bit"',
		],
	)('should handle versionCheck on all known string versions', (versionDescription: string) => {

		expect(versionCheck(mockedDb(versionDescription))).resolves.toBe(undefined);
	});

	it.each([
		'PostgreSQL 11.16 (Debian 11.16-1.pgdg90+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 6.3.0-18+deb9u1) 6.3.0 20170516, 64-bit',
	])('should throw because it is a outdated version', (versionDescription: string) => {

		expect(versionCheck(mockedDb(versionDescription))).rejects.toThrow(`Postgres version not supported: ${versionDescription}. Min required version is: 12.0`);
	});

	it('should not check version if client is not SQLite', () => {
		const sqliteDb = mockedDb('invalid version', DatabaseConfigClient.SQLite);

		expect(versionCheck(sqliteDb)).resolves.toBe(undefined);
	});
});
