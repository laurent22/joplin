import { trimPostToMaximumLength } from './discourse';

describe('utils/discourse', () => {
	it('trimPostToMaximumLength should allow trimming posts to a maximum length', () => {
		const makeLongString = (length: number) => {
			const resultParts = [];
			while (resultParts.length < length) {
				resultParts.push('1');
			}
			return resultParts.join('');
		};

		const longContent = makeLongString(70_000);
		const trimmed = trimPostToMaximumLength(longContent);
		expect(trimmed.length).toBeLessThan(65_000);
		expect(trimmed).toContain(`${longContent.substring(0, 65_000 - 153)}...\n\n**Note**:`);
	});
});
