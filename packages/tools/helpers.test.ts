import * as helpers from './helpers';

describe('helpers', function() {

	describe('flatten', function() {
		test('should flatten 2d array', function() {
			const input = [['1', '2'], ['3', '4'], ['5', 6], [null, undefined]];
			const expected = ['1', '2', '3', '4', '5', 6, null, undefined];
			const actual = helpers.flatten(input);
			expect(actual).toEqual(expected);
		});
	});

	describe('normalizePlatform', function() {
		test('should replace slashes with dashes', function() {
			expect(helpers.normalizePlatform('linux/amd64')).toEqual('linux-amd64');
		});
	});

});
