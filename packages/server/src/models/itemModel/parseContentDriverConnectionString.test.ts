import { ContentDriverConfig, ContentDriverType } from '../../utils/types';
import parseContentDriverConnectionString from './parseContentDriverConnectionString';

describe('parseContentDriverConnectionString', function() {

	test('should parse a connection string', async function() {
		const testCases: Record<string, ContentDriverConfig> = {
			'Type=Database': {
				type: ContentDriverType.Database,
			},
			' Type = Database ': {
				type: ContentDriverType.Database,
			},
			'Type=Filesystem; Path=/path/to/dir': {
				type: ContentDriverType.Filesystem,
				path: '/path/to/dir',
			},
			' Type = Filesystem  ;  Path  = /path/to/dir ': {
				type: ContentDriverType.Filesystem,
				path: '/path/to/dir',
			},
			'Type=Memory;': {
				type: ContentDriverType.Memory,
			},
			'': null,
		};

		for (const [connectionString, config] of Object.entries(testCases)) {
			const actual = parseContentDriverConnectionString(connectionString);
			expect(actual).toEqual(config);
		}
	});

	test('should detect errors', async function() {
		expect(() => parseContentDriverConnectionString('Type=')).toThrow();
		expect(() => parseContentDriverConnectionString('Type;')).toThrow();
		expect(() => parseContentDriverConnectionString('Type=DoesntExist')).toThrow();
		expect(() => parseContentDriverConnectionString('Type=Filesystem')).toThrow();
	});

});
