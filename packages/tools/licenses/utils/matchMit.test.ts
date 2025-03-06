import mit from '../licenseText/mit';
import matchMit from './matchMit';

describe('matchMit', () => {
	test('should match the MIT license template', () => {
		expect(matchMit(mit('test copyright'))).toMatchObject({
			copyright: 'Copyright (c) test copyright',
		});
	});
});
