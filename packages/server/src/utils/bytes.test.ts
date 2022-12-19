import { GB, KB, MB, formatBytes } from './bytes';

describe('bytes', function() {

	it('should convert bytes', async function() {
		expect(1 * KB).toBe(1024);
		expect(1 * MB).toBe(1048576);
		expect(1 * GB).toBe(1073741824);
	});

	it('should display pretty bytes', async function() {
		expect(formatBytes(100 * KB)).toBe('100 kB');
		expect(formatBytes(200 * MB)).toBe('200 MB');
		expect(formatBytes(3 * GB)).toBe('3 GB');
	});

});
