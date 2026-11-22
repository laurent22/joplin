import { errorMessageForLog } from './errors';

describe('errors', () => {

	test.each([
		['Unknown event name: a\nb', 'Unknown event name: a\\nb'],
		['a\r\nfake log line', 'a\\r\\nfake log line'],
		['\x1b[31m red', '\\u001b[31m red'],
		['x'.repeat(600), `${'x'.repeat(500)}...`],
	])('should make a message safe to log: %j', (message, expected) => {
		expect(errorMessageForLog(message)).toBe(expected);
	});

});
