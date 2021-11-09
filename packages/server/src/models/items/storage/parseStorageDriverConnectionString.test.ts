import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import parseStorageDriverConnectionString from './parseStorageDriverConnectionString';

describe('parseStorageDriverConnectionString', function() {

	test('should parse a connection string', async function() {
		const testCases: Record<string, StorageDriverConfig> = {
			'Type=Database': {
				type: StorageDriverType.Database,
			},
			' Type = Database ': {
				type: StorageDriverType.Database,
			},
			'Type=Filesystem; Path=/path/to/dir': {
				type: StorageDriverType.Filesystem,
				path: '/path/to/dir',
			},
			' Type = Filesystem  ;  Path  = /path/to/dir ': {
				type: StorageDriverType.Filesystem,
				path: '/path/to/dir',
			},
			'Type=Memory;': {
				type: StorageDriverType.Memory,
			},
			'': null,
		};

		for (const [connectionString, config] of Object.entries(testCases)) {
			const actual = parseStorageDriverConnectionString(connectionString);
			expect(actual).toEqual(config);
		}
	});

	test('should detect errors', async function() {
		expect(() => parseStorageDriverConnectionString('Path=/path/to/dir')).toThrow(); // Type is missing
		expect(() => parseStorageDriverConnectionString('Type=')).toThrow();
		expect(() => parseStorageDriverConnectionString('Type;')).toThrow();
		expect(() => parseStorageDriverConnectionString('Type=DoesntExist')).toThrow();
		expect(() => parseStorageDriverConnectionString('Type=Filesystem')).toThrow();
	});

});
