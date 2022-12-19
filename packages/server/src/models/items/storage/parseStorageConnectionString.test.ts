import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import parseStorageConnectionString from './parseStorageConnectionString';

describe('parseStorageConnectionString', function() {

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
			const actual = parseStorageConnectionString(connectionString);
			expect(actual).toEqual(config);
		}
	});

	test('should detect errors', async function() {
		expect(() => parseStorageConnectionString('Path=/path/to/dir')).toThrow(); // Type is missing
		expect(() => parseStorageConnectionString('Type=')).toThrow();
		expect(() => parseStorageConnectionString('Type;')).toThrow();
		expect(() => parseStorageConnectionString('Type=DoesntExist')).toThrow();
		expect(() => parseStorageConnectionString('Type=Filesystem')).toThrow();
	});

});
