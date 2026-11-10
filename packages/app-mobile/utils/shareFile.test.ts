import { afterEach, describe, expect, jest, test } from '@jest/globals';
import shim, { MobilePlatform } from '@joplin/lib/shim';
import Share from 'react-native-share';
import shareFile from './shareFile';

jest.mock('react-native-share', () => ({ open: jest.fn() }));

describe('shareFile', () => {
	afterEach(() => jest.restoreAllMocks());

	test.each([
		['md', 'text/plain'],
		['html', 'text/html'],
	])('encodes a literal percent sign in %s file URLs', async (extension, mime) => {
		jest.spyOn(shim, 'mobilePlatform').mockReturnValue(MobilePlatform.Android);

		await shareFile(`/cache/shares/Plan%20A.${extension}`, mime);

		expect(Share.open).toHaveBeenCalledWith(expect.objectContaining({
			filename: `Plan%20A.${extension}`,
			url: `file:///cache/shares/Plan%2520A.${extension}`,
		}));
	});
});
