import { renderErrorBlock } from './makeDiscourseDebugUrl';

describe('makeDiscourseDebugUrl', () => {

	it('should render errors', () => {
		const errors = [
			new Error('First'),
			new Error('Second'),
			'Just a plain string',
		];

		const actual = renderErrorBlock(errors);
		expect(actual.startsWith('```\nError: First\n    at Object')).toBe(true);
		expect(actual.includes(')\n\nError: Second\n    at Object')).toBe(true);
		expect(actual.endsWith(')\n\nJust a plain string\n```')).toBe(true);
	});

});
